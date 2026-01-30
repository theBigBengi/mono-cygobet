// src/routes/admin/sync/seasons.route.ts
import { FastifyPluginAsync } from "fastify";
import { seedSeasons } from "../../../../etl/seeds/seed.seasons";
import { adapter } from "../../../../utils/adapter";
import { AdminSyncSeasonsResponse } from "@repo/types";
import {
  syncBodySchema,
  syncResponseSchema,
} from "../../../../schemas/admin/admin.schemas";
import {
  AdvisoryLockNotAcquiredError,
  AdvisoryLockTimeoutError,
  DEFAULT_LOCK_TIMEOUT_MS,
  withAdvisoryLock,
} from "../../../../utils/advisory-lock";

const LOCK_KEY = "sync:seasons";

const adminSyncSeasonsRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /admin/sync/seasons - Sync seasons from provider to database
  fastify.post<{
    Body: { dryRun?: boolean };
    Reply: AdminSyncSeasonsResponse;
  }>(
    "/seasons",
    {
      schema: {
        body: syncBodySchema,
        response: {
          200: syncResponseSchema,
          409: { type: "object" },
          408: { type: "object" },
        },
      },
    },
    async (req, reply): Promise<AdminSyncSeasonsResponse> => {
      const { dryRun = false } = req.body ?? {};
      const seasonsDto = await adapter.fetchSeasons();
      try {
        return await withAdvisoryLock(
          LOCK_KEY,
          async () => {
            const result = await seedSeasons(seasonsDto, {
              dryRun,
              triggeredBy: "admin-ui",
            });
            return reply.send({
              status: "success",
              data: {
                batchId: result.batchId,
                ok: result.ok,
                fail: result.fail,
                total: result.total,
              },
              message: dryRun
                ? "Seasons sync dry-run completed"
                : "Seasons synced successfully from provider to database",
            });
          },
          { timeoutMs: DEFAULT_LOCK_TIMEOUT_MS }
        );
      } catch (err) {
        if (err instanceof AdvisoryLockNotAcquiredError) {
          return reply.status(409).send({
            status: "error",
            data: { batchId: null, ok: 0, fail: 0, total: 0 },
            message: "Seasons sync already running",
          } as AdminSyncSeasonsResponse);
        }
        if (err instanceof AdvisoryLockTimeoutError) {
          return reply.status(408).send({
            status: "error",
            data: { batchId: null, ok: 0, fail: 0, total: 0 },
            message: "Seasons sync timed out",
          } as AdminSyncSeasonsResponse);
        }
        throw err;
      }
    }
  );

  // POST /admin/sync/seasons/:id - Sync a single season by ID
  fastify.post<{
    Params: { id: string };
    Body: { dryRun?: boolean };
    Reply: AdminSyncSeasonsResponse;
  }>(
    "/seasons/:id",
    {
      schema: {
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
          required: ["id"],
        },
        body: syncBodySchema,
        response: {
          200: syncResponseSchema,
          409: { type: "object" },
          408: { type: "object" },
        },
      },
    },
    async (req, reply): Promise<AdminSyncSeasonsResponse> => {
      const { id } = req.params;
      const { dryRun = false } = req.body ?? {};
      const seasonId = parseInt(id, 10);
      if (isNaN(seasonId)) {
        return reply.code(400).send({
          status: "error",
          data: {
            batchId: null,
            ok: 0,
            fail: 1,
            total: 1,
          },
          message: "Invalid season ID",
        } as any);
      }
      const seasonDto = await adapter.fetchSeasonById(seasonId);
      if (!seasonDto) {
        return reply.code(404).send({
          status: "error",
          data: {
            batchId: null,
            ok: 0,
            fail: 1,
            total: 1,
          },
          message: `Season with ID ${seasonId} not found in provider`,
        } as any);
      }
      try {
        return await withAdvisoryLock(
          LOCK_KEY,
          async () => {
            const result = await seedSeasons([seasonDto], {
              dryRun,
              triggeredBy: "admin-ui",
            });
            return reply.send({
              status: "success",
              data: {
                batchId: result.batchId,
                ok: result.ok,
                fail: result.fail,
                total: result.total,
              },
              message: dryRun
                ? "Season sync dry-run completed"
                : "Season synced successfully from provider to database",
            });
          },
          { timeoutMs: DEFAULT_LOCK_TIMEOUT_MS }
        );
      } catch (err) {
        if (err instanceof AdvisoryLockNotAcquiredError) {
          return reply.status(409).send({
            status: "error",
            data: { batchId: null, ok: 0, fail: 0, total: 0 },
            message: "Seasons sync already running",
          } as AdminSyncSeasonsResponse);
        }
        if (err instanceof AdvisoryLockTimeoutError) {
          return reply.status(408).send({
            status: "error",
            data: { batchId: null, ok: 0, fail: 0, total: 0 },
            message: "Seasons sync timed out",
          } as AdminSyncSeasonsResponse);
        }
        throw err;
      }
    }
  );
};

export default adminSyncSeasonsRoutes;
