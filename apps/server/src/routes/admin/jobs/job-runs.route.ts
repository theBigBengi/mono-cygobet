import { FastifyPluginAsync } from "fastify";
import { prisma, RunStatus } from "@repo/db";
import type {
  AdminBatchItemsResponse,
  AdminJobRunResponse,
  AdminJobRunsListResponse,
} from "@repo/types";
import { NotFoundError } from "../../../utils/errors";

const adminJobRunsDbRoutes: FastifyPluginAsync = async (fastify) => {
  // Mounted under `/admin/jobs` by Fastify autoload folder prefix.
  // Register static /runs paths first so they are matched before /:jobKey.

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
          noOp: noOpCount,
        },
        message: "Job runs fetched successfully",
      });
    }
  );

  // GET /admin/jobs/runs/:runId - Single run (for run detail page)
  fastify.get<{
    Params: { runId: string };
    Reply: AdminJobRunResponse;
  }>(
    "/runs/:runId",
    {
      schema: {
        params: {
          type: "object",
          properties: { runId: { type: "string" } },
          required: ["runId"],
        },
        response: { 200: { type: "object" } },
      },
    },
    async (req, reply): Promise<AdminJobRunResponse> => {
      const runId = Number(req.params.runId);
      if (!Number.isFinite(runId)) {
        throw new NotFoundError("Run not found");
      }
      const run = await prisma.jobRuns.findUnique({
        where: { id: runId },
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
      });
      if (!run) {
        throw new NotFoundError("Run not found");
      }
      return reply.send({
        status: "success",
        data: {
          id: run.id,
          jobKey: run.jobKey,
          job: run.job
            ? { key: run.job.key, description: run.job.description ?? null }
            : null,
          status: String(run.status),
          trigger: String(run.trigger),
          triggeredBy: run.triggeredBy ? String(run.triggeredBy) : null,
          triggeredById: run.triggeredById ?? null,
          startedAt: run.startedAt.toISOString(),
          finishedAt: run.finishedAt?.toISOString() ?? null,
          durationMs: run.durationMs ?? null,
          rowsAffected: run.rowsAffected ?? null,
          errorMessage: run.errorMessage ?? null,
          errorStack: run.errorStack ?? null,
          meta: (run.meta ?? {}) as Record<string, unknown>,
        },
        message: "Run fetched successfully",
      });
    }
  );

  // GET /admin/jobs/runs/:runId/items - Paginated seed_items for run's batch
  fastify.get<{
    Params: { runId: string };
    Querystring: {
      page?: number;
      perPage?: number;
      status?: string;
      action?: string;
      search?: string;
    };
    Reply: AdminBatchItemsResponse;
  }>(
    "/runs/:runId/items",
    {
      schema: {
        params: {
          type: "object",
          properties: { runId: { type: "string" } },
          required: ["runId"],
        },
        querystring: {
          type: "object",
          properties: {
            page: { type: "number", default: 1 },
            perPage: { type: "number", default: 50 },
            status: { type: "string" },
            action: { type: "string" },
            search: { type: "string" },
          },
        },
        response: { 200: { type: "object" } },
      },
    },
    async (req, reply): Promise<AdminBatchItemsResponse> => {
      const runId = Number(req.params.runId);
      if (!Number.isFinite(runId)) {
        return reply.status(404).send({
          status: "error",
          data: [],
          pagination: {
            page: 1,
            perPage: 50,
            totalItems: 0,
            totalPages: 0,
          },
          message: "Run not found",
        } as AdminBatchItemsResponse);
      }
      const run = await prisma.jobRuns.findUnique({
        where: { id: runId },
        select: { meta: true },
      });
      if (!run) {
        return reply.status(404).send({
          status: "error",
          data: [],
          pagination: {
            page: 1,
            perPage: 50,
            totalItems: 0,
            totalPages: 0,
          },
          message: "Run not found",
        } as AdminBatchItemsResponse);
      }
      const meta = (run.meta ?? {}) as Record<string, unknown>;
      const batchId =
        typeof meta.batchId === "number" && Number.isFinite(meta.batchId)
          ? meta.batchId
          : typeof meta.batchId === "string" && /^\d+$/.test(meta.batchId)
            ? Number(meta.batchId)
            : null;

      if (batchId === null) {
        return reply.send({
          status: "success",
          data: [],
          pagination: {
            page: 1,
            perPage: req.query?.perPage ?? 50,
            totalItems: 0,
            totalPages: 0,
          },
          message: "No batch linked to this run",
        });
      }

      const page = Math.max(1, req.query?.page ?? 1);
      const perPage = Math.min(
        Math.max(1, req.query?.perPage ?? 50),
        200
      );
      const skip = (page - 1) * perPage;
      const statusParam = req.query?.status;
      const statusEnum: RunStatus | undefined =
        statusParam && statusParam in RunStatus
          ? (RunStatus as Record<string, RunStatus>)[statusParam]
          : undefined;
      const actionFilter = req.query?.action;
      const searchTerm = req.query?.search?.trim();

      const whereClause: Record<string, unknown> = {
        batchId,
        ...(statusEnum ? { status: statusEnum } : {}),
        ...(actionFilter
          ? { meta: { path: ["action"], equals: actionFilter } }
          : {}),
      };

      if (searchTerm && searchTerm.length >= 3) {
        whereClause.OR = [
          { itemKey: { contains: searchTerm, mode: "insensitive" } },
          { meta: { path: ["name"], string_contains: searchTerm } },
        ];
      }

      const [items, totalItems] = await Promise.all([
        prisma.seedItems.findMany({
          where: whereClause,
          orderBy: { id: "asc" },
          skip,
          take: perPage,
          select: {
            id: true,
            itemKey: true,
            status: true,
            errorMessage: true,
            meta: true,
          },
        }),
        prisma.seedItems.count({ where: whereClause }),
      ]);

      return reply.send({
        status: "success",
        data: items.map((item) => ({
          id: item.id,
          itemKey: item.itemKey,
          status: item.status,
          errorMessage: item.errorMessage,
          meta: item.meta as Record<string, unknown>,
        })),
        pagination: {
          page,
          perPage,
          totalItems,
          totalPages: Math.ceil(totalItems / perPage) || 1,
        },
        message: "Run items fetched successfully",
      });
    }
  );
};

export default adminJobRunsDbRoutes;
