// src/routes/admin/sync/teams.route.ts
import { FastifyPluginAsync } from "fastify";
import { seedTeams } from "../../../etl/seeds/seed.teams";
import SportMonksAdapter from "@repo/sports-data/adapters/sportmonks";
import {
  syncBodySchema,
  syncResponseSchema,
} from "../../../schemas/admin.schemas";

interface SyncTeamsResponse {
  status: string;
  data: {
    batchId: number | null;
    ok: number;
    fail: number;
    total: number;
  };
  message: string;
}

const adminSyncTeamsRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /admin/sync/teams - Sync teams from provider to database
  fastify.post<{
    Body: { dryRun?: boolean };
    Reply: SyncTeamsResponse;
  }>(
    "/teams",
    {
      schema: {
        body: syncBodySchema,
        response: {
          200: syncResponseSchema,
        },
      },
    },
    async (req, reply): Promise<SyncTeamsResponse> => {
      const { dryRun = false } = req.body ?? {};

      const adapter = new SportMonksAdapter({
        token: process.env.SPORTMONKS_API_TOKEN,
        footballBaseUrl: process.env.SPORTMONKS_FOOTBALL_BASE_URL,
        coreBaseUrl: process.env.SPORTMONKS_CORE_BASE_URL,
        authMode:
          (process.env.SPORTMONKS_AUTH_MODE as "query" | "header") || "query",
      });
      const teamsDto = await adapter.fetchTeams();

      const result = await seedTeams(teamsDto, { dryRun });

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
    }
  );

  // POST /admin/sync/teams/:id - Sync a single team by ID
  fastify.post<{
    Params: { id: string };
    Body: { dryRun?: boolean };
    Reply: SyncTeamsResponse;
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
        },
      },
    },
    async (req, reply): Promise<SyncTeamsResponse> => {
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

      const adapter = new SportMonksAdapter({
        token: process.env.SPORTMONKS_API_TOKEN,
        footballBaseUrl: process.env.SPORTMONKS_FOOTBALL_BASE_URL,
        coreBaseUrl: process.env.SPORTMONKS_CORE_BASE_URL,
        authMode:
          (process.env.SPORTMONKS_AUTH_MODE as "query" | "header") || "query",
      });

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

      const result = await seedTeams([teamDto], { dryRun });

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
    }
  );
};

export default adminSyncTeamsRoutes;

