// src/routes/admin/sync/teams.route.ts
import { FastifyPluginAsync } from "fastify";
import { seedTeams } from "../../../../etl/seeds/seed.teams";
import { adapter } from "../../../../utils/adapter";
import { AdminSyncTeamsResponse } from "@repo/types";
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

const LOCK_KEY = "sync:teams";

const adminSyncTeamsRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /admin/sync/teams - Sync teams from provider to database
  fastify.post<{
    Body: { dryRun?: boolean };
    Reply: AdminSyncTeamsResponse;
  }>(
    "/teams",
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
    async (req, reply): Promise<AdminSyncTeamsResponse> => {
      const { dryRun = false } = req.body ?? {};
      const teamsDto = await adapter.fetchTeams();
      try {
        return await withAdvisoryLock(
          LOCK_KEY,
          async () => {
            const result = await seedTeams(teamsDto, {
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
                ? "Teams sync dry-run completed"
                : "Teams synced successfully from provider to database",
            });
          },
          { timeoutMs: DEFAULT_LOCK_TIMEOUT_MS }
        );
      } catch (err) {
        if (err instanceof AdvisoryLockNotAcquiredError) {
          return reply.status(409).send({
            status: "error",
            data: { batchId: null, ok: 0, fail: 0, total: 0 },
            message: "Teams sync already running",
          } as AdminSyncTeamsResponse);
        }
        if (err instanceof AdvisoryLockTimeoutError) {
          return reply.status(408).send({
            status: "error",
            data: { batchId: null, ok: 0, fail: 0, total: 0 },
            message: "Teams sync timed out",
          } as AdminSyncTeamsResponse);
        }
        throw err;
      }
    }
  );

  // POST /admin/sync/teams/:id - Sync a single team by ID
  fastify.post<{
    Params: { id: string };
    Body: { dryRun?: boolean };
    Reply: AdminSyncTeamsResponse;
  }>(
    "/teams/:id",
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
    async (req, reply): Promise<AdminSyncTeamsResponse> => {
      const { id } = req.params;
      const { dryRun = false } = req.body ?? {};
      const teamId = parseInt(id, 10);
      if (isNaN(teamId)) {
        return reply.code(400).send({
          status: "error",
          data: {
            batchId: null,
            ok: 0,
            fail: 1,
            total: 1,
          },
          message: "Invalid team ID",
        } as any);
      }
      const teamDto = await adapter.fetchTeamById(teamId);
      if (!teamDto) {
        return reply.code(404).send({
          status: "error",
          data: {
            batchId: null,
            ok: 0,
            fail: 1,
            total: 1,
          },
          message: `Team with ID ${teamId} not found in provider`,
        } as any);
      }
      try {
        return await withAdvisoryLock(
          LOCK_KEY,
          async () => {
            const result = await seedTeams([teamDto], {
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
                ? "Team sync dry-run completed"
                : "Team synced successfully from provider to database",
            });
          },
          { timeoutMs: DEFAULT_LOCK_TIMEOUT_MS }
        );
      } catch (err) {
        if (err instanceof AdvisoryLockNotAcquiredError) {
          return reply.status(409).send({
            status: "error",
            data: { batchId: null, ok: 0, fail: 0, total: 0 },
            message: "Teams sync already running",
          } as AdminSyncTeamsResponse);
        }
        if (err instanceof AdvisoryLockTimeoutError) {
          return reply.status(408).send({
            status: "error",
            data: { batchId: null, ok: 0, fail: 0, total: 0 },
            message: "Teams sync timed out",
          } as AdminSyncTeamsResponse);
        }
        throw err;
      }
    }
  );
};

export default adminSyncTeamsRoutes;

