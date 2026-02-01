import { FastifyPluginAsync } from "fastify";
import { prisma, RunStatus } from "@repo/db";
import type {
  AdminJobDetailResponse,
  AdminJobRunsListResponse,
} from "@repo/types";
import { AdminJobsConfigService } from "../../../services/admin/jobs-config.service";
import { AppError } from "../../../utils/errors";

/**
 * Parametric job routes. Must be registered after job-runs so that
 * /runs and /runs/:runId are matched before /:jobKey.
 *
 * - GET /admin/jobs/:jobKey - Single job + last 10 runs
 * - GET /admin/jobs/:jobKey/runs - Paginated runs for this job
 */
const adminJobsKeyRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new AdminJobsConfigService(fastify);

  // GET /admin/jobs/:jobKey - Single job with last 10 runs
  fastify.get<{
    Params: { jobKey: string };
    Reply: AdminJobDetailResponse;
  }>(
    "/:jobKey",
    {
      schema: {
        params: {
          type: "object",
          properties: { jobKey: { type: "string" } },
          required: ["jobKey"],
        },
        response: { 200: { type: "object" } },
      },
    },
    async (req, reply): Promise<AdminJobDetailResponse> => {
      try {
        const data = await service.getJob(req.params.jobKey);
        return reply.send({
          status: "success",
          data,
          message: "Job fetched successfully",
        });
      } catch (e: unknown) {
        if (e instanceof AppError) {
          return reply.status(e.status).send({
            status: "error",
            data: null,
            message: e.message,
          } as unknown as AdminJobDetailResponse);
        }
        throw e;
      }
    }
  );

  // GET /admin/jobs/:jobKey/runs - Paginated runs for this job
  fastify.get<{
    Params: { jobKey: string };
    Querystring: {
      limit?: number;
      cursor?: number;
      status?: string;
    };
    Reply: AdminJobRunsListResponse;
  }>(
    "/:jobKey/runs",
    {
      schema: {
        params: {
          type: "object",
          properties: { jobKey: { type: "string" } },
          required: ["jobKey"],
        },
        querystring: {
          type: "object",
          properties: {
            limit: { type: "number", default: 50 },
            cursor: { type: "number" },
            status: { type: "string" },
          },
        },
        response: { 200: { type: "object" } },
      },
    },
    async (req, reply): Promise<AdminJobRunsListResponse> => {
      const { jobKey } = req.params;
      const { status, cursor } = req.query ?? {};
      const limit = Math.min(Math.max(req.query?.limit ?? 50, 1), 200);

      const statusEnum: RunStatus | undefined =
        status && status in RunStatus
          ? (RunStatus as Record<string, RunStatus>)[status]
          : undefined;

      const whereClause = {
        jobKey,
        ...(statusEnum ? { status: statusEnum } : {}),
      };

      const [runs, counts, noOpCount] = await Promise.all([
        prisma.jobRuns.findMany({
          where: {
            ...whereClause,
            ...(cursor ? { id: { lt: cursor } } : {}),
          },
          orderBy: [{ id: "desc" }],
          take: limit,
          select: {
            id: true,
            jobKey: true,
            status: true,
            trigger: true,
            triggeredBy: true,
            triggeredById: true,
            startedAt: true,
            finishedAt: true,
            durationMs: true,
            rowsAffected: true,
            errorMessage: true,
            errorStack: true,
            meta: true,
            job: {
              select: { key: true, description: true },
            },
          },
        }),
        prisma.jobRuns.groupBy({
          by: ["status"],
          where: whereClause,
          _count: { _all: true },
        }),
        prisma.jobRuns.count({
          where: {
            ...whereClause,
            status: RunStatus.success,
            rowsAffected: 0,
          },
        }),
      ]);

      const last = runs.at(-1);
      const nextCursor = last?.id ?? null;

      type RunRow = (typeof runs)[number];
      const mapRun = (r: RunRow) => ({
        id: r.id,
        jobKey: r.jobKey,
        job: r.job
          ? { key: r.job.key, description: r.job.description ?? null }
          : null,
        status: String(r.status),
        trigger: String(r.trigger),
        triggeredBy: r.triggeredBy ? String(r.triggeredBy) : null,
        triggeredById: r.triggeredById ?? null,
        startedAt: r.startedAt.toISOString(),
        finishedAt: r.finishedAt?.toISOString() ?? null,
        durationMs: r.durationMs ?? null,
        rowsAffected: r.rowsAffected ?? null,
        errorMessage: r.errorMessage ?? null,
        errorStack: r.errorStack ?? null,
        meta: (r.meta ?? {}) as Record<string, unknown>,
      });

      const summaryRunning = counts.find(
        (c): c is { status: RunStatus; _count: { _all: number } } =>
          String(c.status) === "running"
      );
      const summaryFailed = counts.find(
        (c): c is { status: RunStatus; _count: { _all: number } } =>
          String(c.status) === "failed"
      );
      const summarySuccess = counts.find(
        (c): c is { status: RunStatus; _count: { _all: number } } =>
          String(c.status) === "success"
      );

      return reply.send({
        status: "success",
        data: runs.map(mapRun),
        nextCursor,
        summary: {
          running: summaryRunning?._count._all ?? 0,
          failed: summaryFailed?._count._all ?? 0,
          success: summarySuccess?._count._all ?? 0,
          noOp: noOpCount,
        },
        message: "Job runs fetched successfully",
      });
    }
  );
};

export default adminJobsKeyRoutes;
