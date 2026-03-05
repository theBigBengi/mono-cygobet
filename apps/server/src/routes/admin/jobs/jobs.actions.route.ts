import { FastifyPluginAsync } from "fastify";
import type { AdminRunAllJobsResponse, AdminRunJobResponse } from "@repo/types";
import { getLockKeyForJob } from "../../../jobs/job-lock-keys";
import {
  AdvisoryLockNotAcquiredError,
  AdvisoryLockTimeoutError,
  DEFAULT_LOCK_TIMEOUT_MS,
  withAdvisoryLock,
} from "../../../utils/advisory-lock";
import { getErrorMessage } from "../../../utils/error.utils";
import {
  RUNNABLE_JOBS,
  getJobRunner,
  makeAdminRunOpts,
} from "../../../jobs/jobs.registry";
import { auditFromRequest } from "../../../services/admin/audit-log.service";

/**
 * Admin Jobs Actions Routes
 * ------------------------
 * Operational endpoints (trigger jobs).
 *
 * Mounted under `/admin/jobs` by Fastify autoload folder prefix.
 *
 * - POST /admin/jobs/:jobId/run
 * - POST /admin/jobs/run-all
 */
const adminJobsActionsRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /admin/jobs/:jobId/run - Trigger a single job (safe manual trigger)
  fastify.post<{
    Params: { jobId: string };
    Body: { dryRun?: boolean };
    Reply: AdminRunJobResponse;
  }>(
    "/:jobId/run",
    {
      schema: {
        params: {
          type: "object",
          properties: { jobId: { type: "string" } },
          required: ["jobId"],
        },
        body: {
          type: "object",
          properties: { dryRun: { type: "boolean" } },
        },
        response: {
          200: { type: "object", additionalProperties: true },
          404: { type: "object", additionalProperties: true },
          409: { type: "object", additionalProperties: true },
          408: { type: "object", additionalProperties: true },
          500: { type: "object", additionalProperties: true },
        },
      },
    },
    async (req, reply): Promise<AdminRunJobResponse> => {
      const { jobId } = req.params;
      const runner = getJobRunner(jobId);
      if (!runner) {
        return reply.status(404).send({
          status: "error",
          data: {
            jobKey: jobId,
            jobRunId: null,
            result: null,
          },
          message: `Job '${jobId}' is not runnable (no runner registered)`,
        });
      }

      const opts = makeAdminRunOpts(req.body);
      const lockKey = getLockKeyForJob(jobId);

      try {
        const result: any = await withAdvisoryLock(
          lockKey,
          (signal) => runner(fastify, { ...opts, signal }),
          { timeoutMs: DEFAULT_LOCK_TIMEOUT_MS }
        );
        const jobRunId =
          typeof result?.jobRunId === "number" ? result.jobRunId : null;

        auditFromRequest(req, reply, {
          action: "job.trigger",
          category: "jobs",
          description: `Triggered job "${jobId}"${req.body?.dryRun ? " (dry-run)" : ""}`,
          targetType: "job",
          targetId: jobId,
          metadata: { dryRun: !!req.body?.dryRun, jobRunId },
        });

        return reply.send({
          status: "success",
          data: {
            jobKey: jobId,
            jobRunId,
            result,
          },
          message: req.body?.dryRun
            ? "Job dry-run triggered successfully"
            : "Job triggered successfully",
        });
      } catch (err: unknown) {
        if (err instanceof AdvisoryLockNotAcquiredError) {
          return reply.status(409).send({
            status: "error",
            data: {
              jobKey: jobId,
              jobRunId: null,
              result: null,
            },
            message: "Job already running (lock not acquired)",
          });
        }
        if (err instanceof AdvisoryLockTimeoutError) {
          return reply.status(408).send({
            status: "error",
            data: {
              jobKey: jobId,
              jobRunId: null,
              result: null,
            },
            message: "Job timed out (lock will be released when job finishes)",
          });
        }
        const baseMessage = getErrorMessage(err) || "Unknown error";
        const providerCode =
          err && typeof err === "object" && "code" in err
            ? (err as { code?: string }).code
            : undefined;
        const providerStatus =
          err && typeof err === "object" && "statusCode" in err
            ? (err as { statusCode?: number }).statusCode
            : undefined;

        return reply.status(500).send({
          status: "error",
          data: {
            jobKey: jobId,
            jobRunId: null,
            result: null,
            providerError: providerCode
              ? { code: providerCode, statusCode: providerStatus }
              : undefined,
          },
          message: baseMessage,
        });
      }
    }
  );

  // POST /admin/jobs/run-all - Trigger all runnable jobs
  fastify.post<{
    Body: { dryRun?: boolean };
    Reply: AdminRunAllJobsResponse;
  }>(
    "/run-all",
    {
      schema: {
        body: {
          type: "object",
          properties: { dryRun: { type: "boolean" } },
        },
        response: { 200: { type: "object" } },
      },
    },
    async (req, reply): Promise<AdminRunAllJobsResponse> => {
      const opts = makeAdminRunOpts(req.body);

      const results: Array<{
        jobKey: string;
        jobRunId: number | null;
        status: "success" | "error";
        error?: string;
      }> = [];

      let ok = 0;
      let fail = 0;

      // Run sequentially for safety (avoid spiking provider / DB load)
      for (const job of RUNNABLE_JOBS) {
        const lockKey = getLockKeyForJob(job.key);
        try {
          const res: any = await withAdvisoryLock(
            lockKey,
            (signal) => job.run(fastify, { ...opts, signal }),
            { timeoutMs: DEFAULT_LOCK_TIMEOUT_MS }
          );
          ok++;
          results.push({
            jobKey: job.key,
            jobRunId: typeof res?.jobRunId === "number" ? res.jobRunId : null,
            status: "success",
          });
        } catch (e: unknown) {
          fail++;
          const errorMessage =
            e instanceof AdvisoryLockNotAcquiredError
              ? "Lock not acquired (job already running elsewhere)"
              : e instanceof AdvisoryLockTimeoutError
                ? "Job timed out (lock will be released when job finishes)"
                : getErrorMessage(e) || "Unknown error";
          results.push({
            jobKey: job.key,
            jobRunId: null,
            status: "error",
            error: errorMessage,
          });
        }
      }

      auditFromRequest(req, reply, {
        action: "job.trigger-all",
        category: "jobs",
        description: `Triggered all ${RUNNABLE_JOBS.length} jobs (${ok} ok, ${fail} fail)`,
        metadata: { dryRun: !!req.body?.dryRun, ok, fail, triggeredCount: RUNNABLE_JOBS.length },
      });

      return reply.send({
        status: "success",
        data: {
          triggeredCount: RUNNABLE_JOBS.length,
          ok,
          fail,
          results,
        },
        message: "Run-all triggered",
      });
    }
  );
};

export default adminJobsActionsRoutes;
