// src/routes/admin/sync/leagues.route.ts
import { FastifyPluginAsync } from "fastify";
import { seedLeagues } from "../../../etl/seeds/seed.leagues";
import SportMonksAdapter from "@repo/sports-data/adapters/sportmonks";
import {
  syncBodySchema,
  syncResponseSchema,
} from "../../../schemas/admin.schemas";

interface SyncLeaguesResponse {
  status: string;
  data: {
    batchId: number | null;
    ok: number;
    fail: number;
    total: number;
  };
  message: string;
}

const adminSyncLeaguesRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /admin/sync/leagues - Sync leagues from provider to database
  fastify.post<{
    Body: { dryRun?: boolean };
    Reply: SyncLeaguesResponse;
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
    async (req, reply): Promise<SyncLeaguesResponse> => {
      const { dryRun = false } = req.body ?? {};

      const adapter = new SportMonksAdapter({
        token: process.env.SPORTMONKS_API_TOKEN,
        footballBaseUrl: process.env.SPORTMONKS_FOOTBALL_BASE_URL,
        coreBaseUrl: process.env.SPORTMONKS_CORE_BASE_URL,
        authMode:
          (process.env.SPORTMONKS_AUTH_MODE as "query" | "header") || "query",
      });
      const leaguesDto = await adapter.fetchLeagues();

      const result = await seedLeagues(leaguesDto, { dryRun });

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
};

export default adminSyncLeaguesRoutes;
