// src/routes/admin/sync/countries.route.ts
import { FastifyPluginAsync } from "fastify";
import SportMonksAdapter from "@repo/sports-data/adapters/sportmonks";
import { seedCountries } from "../../../etl/seeds/seed.countries";
import { AdminSyncCountriesResponse } from "@repo/types";
import {
  syncBodySchema,
  syncResponseSchema,
} from "../../../schemas/admin.schemas";

const adminSyncCountriesRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /admin/sync/countries - Sync countries from provider to database
  fastify.post<{
    Body: { dryRun?: boolean };
    Reply: AdminSyncCountriesResponse;
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
    async (req, reply): Promise<AdminSyncCountriesResponse> => {
      const { dryRun = false } = req.body ?? {};

      const adapter = new SportMonksAdapter({
        token: process.env.SPORTMONKS_API_TOKEN,
        footballBaseUrl: process.env.SPORTMONKS_FOOTBALL_BASE_URL,
        coreBaseUrl: process.env.SPORTMONKS_CORE_BASE_URL,
        authMode:
          (process.env.SPORTMONKS_AUTH_MODE as "query" | "header") || "query",
      });
      const countriesDto = await adapter.fetchCountries();
      const result = await seedCountries(countriesDto, {
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
          ? "Countries sync dry-run completed"
          : "Countries synced successfully from provider to database",
      });
    }
  );

  // POST /admin/sync/countries/:id - Sync a single country by ID from provider to database
  fastify.post<{
    Params: { id: string };
    Body: { dryRun?: boolean };
    Reply: AdminSyncCountriesResponse;
  }>(
    "/countries/:id",
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
    async (req, reply): Promise<AdminSyncCountriesResponse> => {
      const { id } = req.params;
      const { dryRun = false } = req.body ?? {};

      const countryId = Number(id);
      if (isNaN(countryId)) {
        return reply.status(400).send({
          status: "error",
          data: {
            batchId: null,
            ok: 0,
            fail: 1,
            total: 1,
          },
          message: `Invalid country ID: ${id}`,
        });
      }

      const adapter = new SportMonksAdapter({
        token: process.env.SPORTMONKS_API_TOKEN,
        footballBaseUrl: process.env.SPORTMONKS_FOOTBALL_BASE_URL,
        coreBaseUrl: process.env.SPORTMONKS_CORE_BASE_URL,
        authMode:
          (process.env.SPORTMONKS_AUTH_MODE as "query" | "header") || "query",
      });

      const countryDto = await adapter.fetchCountryById(countryId);

      if (!countryDto) {
        return reply.status(404).send({
          status: "error",
          data: {
            batchId: null,
            ok: 0,
            fail: 1,
            total: 1,
          },
          message: `Country with ID ${countryId} not found in provider`,
        });
      }

      const result = await seedCountries([countryDto], {
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
          ? `Country sync dry-run completed for ID ${countryId}`
          : `Country synced successfully from provider to database (ID: ${countryId})`,
      });
    }
  );
};

export default adminSyncCountriesRoutes;
