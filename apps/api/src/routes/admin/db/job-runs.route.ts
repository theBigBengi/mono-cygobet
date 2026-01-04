import { FastifyPluginAsync } from "fastify";
import { prisma, RunStatus } from "@repo/db";
import type { AdminJobRunsListResponse } from "@repo/types";

const adminJobRunsDbRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /admin/db/job-runs - List job runs (supports jobId, status, limit, cursor)
  fastify.get<{
    Querystring: {
      jobId?: string;
      status?: string;
      limit?: number;
      cursor?: number;
    };
    Reply: AdminJobRunsListResponse;
  }>(
    "/job-runs",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            jobId: { type: "string" },
            status: { type: "string" },
            limit: { type: "number", default: 50 },
            cursor: { type: "number" },
          },
        },
        response: {
          200: { type: "object" },
        },
      },
    },
    async (req, reply): Promise<AdminJobRunsListResponse> => {
      const { jobId, status, cursor } = req.query ?? {};
      const limit = Math.min(Math.max(req.query?.limit ?? 50, 1), 200);

      const statusEnum = status
        ? ((RunStatus as any)[status] ?? status)
        : undefined;

      const runs = await prisma.jobRuns.findMany({
        where: {
          ...(jobId ? { jobKey: jobId } : {}),
          ...(statusEnum ? { status: statusEnum } : {}),
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
            select: {
              key: true,
              description: true,
            },
          },
        },
      });

      const last = runs.at(-1);
      const nextCursor = last?.id ?? null;

      return reply.send({
        status: "success",
        data: runs.map((r) => ({
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
        })),
        nextCursor,
        message: "Job runs fetched successfully",
      });
    }
  );
};

export default adminJobRunsDbRoutes;
