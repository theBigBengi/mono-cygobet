import { FastifyPluginAsync } from "fastify";
import type { AdminRunAllJobsResponse, AdminRunJobResponse } from "@repo/types";
import {
  RUNNABLE_JOBS,
  getJobRunner,
  makeAdminRunOpts,
} from "../../../jobs/jobs.registry";

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
          200: { type: "object" },
          404: { type: "object" },
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

      try {
        const result: any = await runner(fastify, opts);
        const jobRunId =
          typeof result?.jobRunId === "number" ? result.jobRunId : null;

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
      } catch (err: any) {
        return reply.status(500).send({
          status: "error",
          data: {
            jobKey: jobId,
            jobRunId: null,
            result: null,
          },
          message: String(err?.message ?? err ?? "Unknown error"),
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
        try {
          const res: any = await job.run(fastify, opts);
          ok++;
          results.push({
            jobKey: job.key,
            jobRunId: typeof res?.jobRunId === "number" ? res.jobRunId : null,
            status: "success",
          });
        } catch (e: any) {
          fail++;
          results.push({
            jobKey: job.key,
            jobRunId: null,
            status: "error",
            error: String(e?.message ?? e ?? "Unknown error"),
          });
        }
      }

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

console.log("REGISTERING adminJobsActionsRoutes");
export default adminJobsActionsRoutes;
