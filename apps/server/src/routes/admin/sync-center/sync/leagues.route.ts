// src/routes/admin/sync/leagues.route.ts
import { FastifyPluginAsync } from "fastify";
import { seedLeagues } from "../../../../etl/seeds/seed.leagues";
import { adapter } from "../../../../utils/adapter";
import { availabilityService } from "../../../../services/availability.service";
import { AdminSyncLeaguesResponse } from "@repo/types";
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

const LOCK_KEY = "sync:leagues";

const adminSyncLeaguesRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /admin/sync/leagues - Sync leagues from provider to database
  fastify.post<{
    Body: { dryRun?: boolean };
    Reply: AdminSyncLeaguesResponse;
  }>(
    "/leagues",
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
    async (req, reply): Promise<AdminSyncLeaguesResponse> => {
      const { dryRun = false } = req.body ?? {};
      const leaguesDto = await adapter.fetchLeagues();
      try {
        return await withAdvisoryLock(
          LOCK_KEY,
          async () => {
            const result = await seedLeagues(leaguesDto, {
              dryRun,
              triggeredBy: "admin-ui",
            });
            await availabilityService.invalidateCache().catch(() => {});
            return reply.send({
              status: "success",
              data: {
                batchId: result.batchId,
                ok: result.ok,
                fail: result.fail,
                total: result.total,
              },
              message: dryRun
                ? "Leagues sync dry-run completed"
                : "Leagues synced successfully from provider to database",
            });
          },
          { timeoutMs: DEFAULT_LOCK_TIMEOUT_MS }
        );
      } catch (err) {
        if (err instanceof AdvisoryLockNotAcquiredError) {
          return reply.status(409).send({
            status: "error",
            data: { batchId: null, ok: 0, fail: 0, total: 0 },
            message: "Leagues sync already running",
          } as AdminSyncLeaguesResponse);
        }
        if (err instanceof AdvisoryLockTimeoutError) {
          return reply.status(408).send({
            status: "error",
            data: { batchId: null, ok: 0, fail: 0, total: 0 },
            message: "Leagues sync timed out",
          } as AdminSyncLeaguesResponse);
        }
        throw err;
      }
    }
  );

  // POST /admin/sync/leagues/:id - Sync a single league by ID from provider to database
  fastify.post<{
    Params: { id: string };
    Body: { dryRun?: boolean };
    Reply: AdminSyncLeaguesResponse;
  }>(
    "/leagues/:id",
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
        },
      },
    },
    async (req, reply): Promise<AdminSyncLeaguesResponse> => {
      try {
        return await withAdvisoryLock(
          LOCK_KEY,
          async () => {
            const { id } = req.params;
            const { dryRun = false } = req.body ?? {};
            const leagueId = Number(id);
            if (isNaN(leagueId)) {
              return reply.status(400).send({
                status: "error",
                data: {
                  batchId: null,
                  ok: 0,
                  fail: 1,
                  total: 1,
                },
                message: `Invalid league ID: ${id}`,
              });
            }
            const leagueDto = await adapter.fetchLeagueById(leagueId);
            if (!leagueDto) {
              return reply.status(404).send({
                status: "error",
                data: {
                  batchId: null,
                  ok: 0,
                  fail: 1,
                  total: 1,
                },
                message: `League with ID ${leagueId} not found in provider`,
              });
            }
            const result = await seedLeagues([leagueDto], {
              dryRun,
              triggeredBy: "admin-ui",
            });
            await availabilityService.invalidateCache().catch(() => {});
            return reply.send({
              status: "success",
              data: {
                batchId: result.batchId,
                ok: result.ok,
                fail: result.fail,
                total: result.total,
              },
              message: dryRun
                ? `League sync dry-run completed for ID ${leagueId}`
                : `League synced successfully from provider to database (ID: ${leagueId})`,
            });
          },
          { timeoutMs: DEFAULT_LOCK_TIMEOUT_MS }
        );
      } catch (err) {
        if (err instanceof AdvisoryLockNotAcquiredError) {
          return reply.status(409).send({
            status: "error",
            data: { batchId: null, ok: 0, fail: 0, total: 0 },
            message: "Leagues sync already running",
          } as AdminSyncLeaguesResponse);
        }
        if (err instanceof AdvisoryLockTimeoutError) {
          return reply.status(408).send({
            status: "error",
            data: { batchId: null, ok: 0, fail: 0, total: 0 },
            message: "Leagues sync timed out",
          } as AdminSyncLeaguesResponse);
        }
        throw err;
      }
    }
  );
};

export default adminSyncLeaguesRoutes;
