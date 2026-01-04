// src/routes/admin/sync/leagues.route.ts
import { FastifyPluginAsync } from "fastify";
import { seedLeagues } from "../../../etl/seeds/seed.leagues";
import SportMonksAdapter from "@repo/sports-data/adapters/sportmonks";
import { AdminSyncLeaguesResponse } from "@repo/types";
import {
  syncBodySchema,
  syncResponseSchema,
} from "../../../schemas/admin/admin.schemas";

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
        },
      },
    },
    async (req, reply): Promise<AdminSyncLeaguesResponse> => {
      const { dryRun = false } = req.body ?? {};

      const adapter = new SportMonksAdapter({
        token: process.env.SPORTMONKS_API_TOKEN,
        footballBaseUrl: process.env.SPORTMONKS_FOOTBALL_BASE_URL,
        coreBaseUrl: process.env.SPORTMONKS_CORE_BASE_URL,
        authMode:
          (process.env.SPORTMONKS_AUTH_MODE as "query" | "header") || "query",
      });
      const leaguesDto = await adapter.fetchLeagues();

      const result = await seedLeagues(leaguesDto, {
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
          ? "Leagues sync dry-run completed"
          : "Leagues synced successfully from provider to database",
      });
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
        },
      },
    },
    async (req, reply): Promise<AdminSyncLeaguesResponse> => {
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

      const adapter = new SportMonksAdapter({
        token: process.env.SPORTMONKS_API_TOKEN,
        footballBaseUrl: process.env.SPORTMONKS_FOOTBALL_BASE_URL,
        coreBaseUrl: process.env.SPORTMONKS_CORE_BASE_URL,
        authMode:
          (process.env.SPORTMONKS_AUTH_MODE as "query" | "header") || "query",
      });

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
    }
  );
};

export default adminSyncLeaguesRoutes;
