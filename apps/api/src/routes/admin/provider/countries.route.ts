// src/routes/admin/provider/countries.route.ts
import { FastifyPluginAsync } from "fastify";
import { SportMonksAdapter } from "@repo/sports-data/adapters/sportmonks";
import { AdminProviderCountriesResponse } from "@repo/types";
import { providerResponseSchema } from "../../../schemas/admin.schemas";

const adminCountriesProviderRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /admin/countries/provider - Get countries from SportMonks provider
  fastify.get<{ Reply: AdminProviderCountriesResponse }>(
    "/countries",
    {
      schema: {
        response: {
          200: providerResponseSchema,
        },
      },
    },
    async (req, reply): Promise<AdminProviderCountriesResponse> => {
      const adapter = new SportMonksAdapter({
        token: process.env.SPORTMONKS_API_TOKEN,
        footballBaseUrl: process.env.SPORTMONKS_FOOTBALL_BASE_URL,
        coreBaseUrl: process.env.SPORTMONKS_CORE_BASE_URL,
        authMode:
          (process.env.SPORTMONKS_AUTH_MODE as "query" | "header") || "query",
      });

      const countriesDto = await adapter.fetchCountries();

      return reply.send({
        status: "success",
        data: countriesDto.map((c) => ({
          externalId: c.externalId,
          name: c.name,
          imagePath: c.imagePath ?? null,
          iso2: c.iso2 ?? null,
          iso3: c.iso3 ?? null,
        })),
        message: "Countries fetched from provider successfully",
        provider: "sportmonks",
      });
    }
  );
};

export default adminCountriesProviderRoutes;
