// src/routes/admin/sync/countries.route.ts
import { FastifyPluginAsync } from "fastify";
import SportMonksAdapter from "@repo/sports-data/adapters/sportmonks";
import { seedCountries } from "../../../etl/seeds/seed.countries";
import {
  syncBodySchema,
  syncResponseSchema,
} from "../../../schemas/admin.schemas";

interface SyncCountriesResponse {
  status: string;
  data: {
    batchId: number | null;
    ok: number;
    fail: number;
    total: number;
  };
  message: string;
}

const adminSyncCountriesRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /admin/sync/countries - Sync countries from provider to database
  fastify.post<{
    Body: { dryRun?: boolean };
    Reply: SyncCountriesResponse;
  }>(
    "/countries",
    {
      schema: {
        body: syncBodySchema,
        response: {
          200: syncResponseSchema,
        },
      },
    },
    async (req, reply): Promise<SyncCountriesResponse> => {
      const { dryRun = false } = req.body ?? {};

      const adapter = new SportMonksAdapter({
        token: process.env.SPORTMONKS_API_TOKEN,
        footballBaseUrl: process.env.SPORTMONKS_FOOTBALL_BASE_URL,
        coreBaseUrl: process.env.SPORTMONKS_CORE_BASE_URL,
        authMode:
          (process.env.SPORTMONKS_AUTH_MODE as "query" | "header") || "query",
      });
      const countriesDto = await adapter.fetchCountries();
      const result = await seedCountries(countriesDto, { dryRun });

      return reply.send({
        status: "success",
        data: {
          batchId: result.batchId,
          ok: result.ok,
          fail: result.fail,
          total: result.total,
        },
        message: dryRun
          ? "Countries sync dry-run completed"
          : "Countries synced successfully from provider to database",
      });
    }
  );
};

export default adminSyncCountriesRoutes;
