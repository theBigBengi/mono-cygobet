import { FastifyPluginAsync } from "fastify";
import { prisma, RunStatus } from "@repo/db";
import type { AdminJobRunsListResponse } from "@repo/types";

const adminJobRunsDbRoutes: FastifyPluginAsync = async (fastify) => {
  // Mounted under `/admin/jobs` by Fastify autoload folder prefix.
  // GET /admin/jobs/runs - List job runs (supports jobId, status, limit, cursor)
  fastify.get<{
    Querystring: {
      jobId?: string;
      status?: string;
      limit?: number;
      cursor?: number;
      search?: string;
    };
    Reply: AdminJobRunsListResponse;
  }>(
    "/runs",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            jobId: { type: "string" },
            status: { type: "string" },
            limit: { type: "number", default: 50 },
            cursor: { type: "number" },
            search: { type: "string" },
          },
        },
        response: {
          200: { type: "object" },
        },
      },
    },
    async (req, reply): Promise<AdminJobRunsListResponse> => {
      const { jobId, status, cursor, search } = req.query ?? {};
      const limit = Math.min(Math.max(req.query?.limit ?? 50, 1), 200);

      const statusEnum = status
        ? ((RunStatus as any)[status] ?? status)
        : undefined;

      const whereClause = {
        ...(jobId ? { jobKey: jobId } : {}),
        ...(statusEnum ? { status: statusEnum } : {}),
        ...(search
          ? {
              OR: [
                {
                  jobKey: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
                ...(/^\d+$/.test(search) ? [{ id: Number(search) }] : []),
              ],
            }
          : {}),
      };

      const [runs, counts] = await Promise.all([
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
              select: {
                key: true,
                description: true,
              },
            },
          },
        }),
        prisma.jobRuns.groupBy({
          by: ["status"],
          where: whereClause,
          _count: { _all: true },
        }),
      ]);

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
        summary: {
          running:
            counts.find((c) => String(c.status) === "running")?._count._all ?? 0,
          failed:
            counts.find((c) => String(c.status) === "failed")?._count._all ?? 0,
          success:
            counts.find((c) => String(c.status) === "success")?._count._all ?? 0,
        },
        message: "Job runs fetched successfully",
      });
    }
  );
};

export default adminJobRunsDbRoutes;
