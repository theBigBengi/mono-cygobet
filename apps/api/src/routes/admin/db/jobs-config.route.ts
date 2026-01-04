import { FastifyPluginAsync } from "fastify";
import { prisma } from "@repo/db";
import type {
  AdminJobsListResponse,
  AdminUpdateJobResponse,
} from "@repo/types";
import { isJobRunnable } from "../../../jobs/jobs.registry";
import cron from "node-cron";

/**
 * Admin Jobs DB Routes
 * -------------------
 * Database-backed job configuration and listing:
 *
 * - GET   /admin/db/jobs
 * - PATCH /admin/db/jobs/:jobId
 */
const adminJobsDbRoutes: FastifyPluginAsync = async (fastify) => {
  function isPlainObject(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && !Array.isArray(v);
  }

  // GET /admin/db/jobs - List jobs from database (plus derived last run + runnable flag)
  fastify.get<{ Reply: AdminJobsListResponse }>(
    "/jobs",
    {
      schema: {
        response: {
          200: { type: "object" },
        },
      },
    },
    async (_req, reply): Promise<AdminJobsListResponse> => {
      // Backward-compatible: `jobs.meta` may not exist until migrations/prisma generate are applied.
      // Try to include meta; fallback to meta={} if the field isn't available yet.
      let jobs: any[] = [];
      try {
        jobs = await prisma.jobs.findMany({
          orderBy: { key: "asc" },
          select: {
            key: true,
            description: true,
            scheduleCron: true,
            enabled: true,
            meta: true,
            createdAt: true,
            updatedAt: true,
            runs: {
              take: 1,
              orderBy: { startedAt: "desc" },
              select: {
                id: true,
                status: true,
                trigger: true,
                triggeredBy: true,
                startedAt: true,
                finishedAt: true,
                durationMs: true,
                rowsAffected: true,
                errorMessage: true,
              },
            },
          } as any,
        } as any);
      } catch {
        jobs = await prisma.jobs.findMany({
          orderBy: { key: "asc" },
          select: {
            key: true,
            description: true,
            scheduleCron: true,
            enabled: true,
            createdAt: true,
            updatedAt: true,
            runs: {
              take: 1,
              orderBy: { startedAt: "desc" },
              select: {
                id: true,
                status: true,
                trigger: true,
                triggeredBy: true,
                startedAt: true,
                finishedAt: true,
                durationMs: true,
                rowsAffected: true,
                errorMessage: true,
              },
            },
          },
        });
      }

      return reply.send({
        status: "success",
        data: jobs.map((j) => {
          const lastRun = j.runs?.[0];
          return {
            key: j.key,
            description: j.description ?? null,
            scheduleCron: j.scheduleCron ?? null,
            enabled: j.enabled,
            meta:
              typeof j.meta === "object" && j.meta
                ? (j.meta as Record<string, unknown>)
                : {},
            createdAt: j.createdAt.toISOString(),
            updatedAt: j.updatedAt.toISOString(),
            runnable: isJobRunnable(j.key),
            lastRun: lastRun
              ? {
                  id: lastRun.id,
                  status: String(lastRun.status),
                  trigger: String(lastRun.trigger),
                  triggeredBy: lastRun.triggeredBy
                    ? String(lastRun.triggeredBy)
                    : null,
                  startedAt: lastRun.startedAt.toISOString(),
                  finishedAt: lastRun.finishedAt?.toISOString() ?? null,
                  durationMs: lastRun.durationMs ?? null,
                  rowsAffected: lastRun.rowsAffected ?? null,
                  errorMessage: lastRun.errorMessage ?? null,
                }
              : null,
          };
        }),
        message: "Jobs fetched successfully",
      });
    }
  );

  // PATCH /admin/db/jobs/:jobId - Update job fields (description/enabled/scheduleCron)
  fastify.patch<{
    Params: { jobId: string };
    Body: {
      description?: string | null;
      enabled?: boolean;
      scheduleCron?: string | null;
      meta?: Record<string, unknown> | null;
    };
    Reply: AdminUpdateJobResponse;
  }>(
    "/jobs/:jobId",
    {
      schema: {
        params: {
          type: "object",
          properties: { jobId: { type: "string" } },
          required: ["jobId"],
        },
        body: {
          type: "object",
          properties: {
            description: { anyOf: [{ type: "string" }, { type: "null" }] },
            enabled: { type: "boolean" },
            scheduleCron: { anyOf: [{ type: "string" }, { type: "null" }] },
            meta: { type: ["object", "null"] },
          },
        },
        response: {
          200: { type: "object" },
        },
      },
    },
    async (req, reply): Promise<AdminUpdateJobResponse> => {
      const { jobId } = req.params;
      const body = req.body ?? {};

      if (body.meta !== undefined && body.meta !== null && !isPlainObject(body.meta)) {
        return reply.status(400).send({
          status: "error",
          data: null,
          message: "Invalid meta: expected a JSON object",
        } as any);
      }

      const scheduleCronRaw =
        typeof body.scheduleCron === "string"
          ? body.scheduleCron.trim()
          : body.scheduleCron;
      const scheduleCron =
        scheduleCronRaw === ""
          ? null
          : (scheduleCronRaw as string | null | undefined);

      if (typeof scheduleCron === "string" && !cron.validate(scheduleCron)) {
        return reply.status(400).send({
          status: "error",
          data: null,
          message: `Invalid cron expression: '${scheduleCron}'`,
        } as any);
      }

      let updated: any;
      try {
        updated = await prisma.jobs.update({
          where: { key: jobId },
          data: {
            ...(body.description !== undefined
              ? { description: body.description }
              : {}),
            ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
            ...(body.scheduleCron !== undefined ? { scheduleCron } : {}),
            ...(body.meta !== undefined ? { meta: body.meta ?? {} } : {}),
          } as any,
          select: {
            key: true,
            description: true,
            scheduleCron: true,
            enabled: true,
            meta: true,
            createdAt: true,
            updatedAt: true,
            runs: {
              take: 1,
              orderBy: { startedAt: "desc" },
              select: {
                id: true,
                status: true,
                trigger: true,
                triggeredBy: true,
                startedAt: true,
                finishedAt: true,
                durationMs: true,
                rowsAffected: true,
                errorMessage: true,
              },
            },
          } as any,
        } as any);
      } catch {
        // Fallback: meta column not available yet
        updated = await prisma.jobs.update({
          where: { key: jobId },
          data: {
            ...(body.description !== undefined
              ? { description: body.description }
              : {}),
            ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
            ...(body.scheduleCron !== undefined ? { scheduleCron } : {}),
          },
          select: {
            key: true,
            description: true,
            scheduleCron: true,
            enabled: true,
            createdAt: true,
            updatedAt: true,
            runs: {
              take: 1,
              orderBy: { startedAt: "desc" },
              select: {
                id: true,
                status: true,
                trigger: true,
                triggeredBy: true,
                startedAt: true,
                finishedAt: true,
                durationMs: true,
                rowsAffected: true,
                errorMessage: true,
              },
            },
          },
        });
      }

      const lastRun = updated.runs?.[0];

      return reply.send({
        status: "success",
        data: {
          key: updated.key,
          description: updated.description ?? null,
          scheduleCron: updated.scheduleCron ?? null,
          enabled: updated.enabled,
          meta:
            typeof updated.meta === "object" && updated.meta
              ? (updated.meta as Record<string, unknown>)
              : {},
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
          runnable: isJobRunnable(updated.key),
          lastRun: lastRun
            ? {
                id: lastRun.id,
                status: String(lastRun.status),
                trigger: String(lastRun.trigger),
                triggeredBy: lastRun.triggeredBy
                  ? String(lastRun.triggeredBy)
                  : null,
                startedAt: lastRun.startedAt.toISOString(),
                finishedAt: lastRun.finishedAt?.toISOString() ?? null,
                durationMs: lastRun.durationMs ?? null,
                rowsAffected: lastRun.rowsAffected ?? null,
                errorMessage: lastRun.errorMessage ?? null,
              }
            : null,
        },
        message: "Job updated successfully",
      });
    }
  );
};

export default adminJobsDbRoutes;


