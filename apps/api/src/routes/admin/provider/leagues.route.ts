// src/routes/admin/provider/leagues.route.ts
import { FastifyPluginAsync } from "fastify";
import { SportMonksAdapter } from "@repo/sports-data/adapters/sportmonks";
import { AdminProviderLeaguesResponse } from "@repo/types";
import { providerResponseSchema } from "../../../schemas/admin.schemas";

const adminLeaguesProviderRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /admin/leagues/provider - Get leagues from SportMonks provider
  fastify.get<{ Reply: AdminProviderLeaguesResponse }>(
    "/leagues",
    {
      schema: {
        response: {
          200: providerResponseSchema,
        },
      },
    },
    async (req, reply): Promise<AdminProviderLeaguesResponse> => {
      const adapter = new SportMonksAdapter({
        token: process.env.SPORTMONKS_API_TOKEN,
        footballBaseUrl: process.env.SPORTMONKS_FOOTBALL_BASE_URL,
        coreBaseUrl: process.env.SPORTMONKS_CORE_BASE_URL,
        authMode:
          (process.env.SPORTMONKS_AUTH_MODE as "query" | "header") || "query",
      });

      const leaguesDto = await adapter.fetchLeagues();

      return reply.send({
        status: "success",
        data: leaguesDto.map((l) => ({
          externalId: l.externalId,
          name: l.name,
          imagePath: l.imagePath ?? null,
          countryExternalId: l.countryExternalId ?? null,
          shortCode: l.shortCode ?? null,
          type: l.type ?? null,
          subType: l.subType ?? null,
        })),
        message: "Leagues fetched from provider successfully",
        provider: "sportmonks",
      });
    }
  );
};

export default adminLeaguesProviderRoutes;
