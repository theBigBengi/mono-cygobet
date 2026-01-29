// src/routes/admin/provider/seasons.route.ts
import { FastifyPluginAsync } from "fastify";
import { SportMonksAdapter } from "@repo/sports-data/adapters/sportmonks";
import { AdminProviderSeasonsResponse } from "@repo/types";
import { providerResponseSchema } from "../../../../schemas/admin/admin.schemas";
import { prisma } from "@repo/db";

const adminSeasonsProviderRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /admin/seasons/provider - Get seasons from SportMonks provider
  fastify.get<{ Reply: AdminProviderSeasonsResponse }>(
    "/seasons",
    {
      schema: {
        response: {
          200: providerResponseSchema,
        },
      },
    },
    async (req, reply): Promise<AdminProviderSeasonsResponse> => {
      const adapter = new SportMonksAdapter({
        token: process.env.SPORTMONKS_API_TOKEN,
        footballBaseUrl: process.env.SPORTMONKS_FOOTBALL_BASE_URL,
        coreBaseUrl: process.env.SPORTMONKS_CORE_BASE_URL,
        authMode:
          (process.env.SPORTMONKS_AUTH_MODE as "query" | "header") || "query",
      });

      // Fetch seasons from provider
      const seasonsDto = await adapter.fetchSeasons();

      // Get all league external IDs from DB to check availability
      const dbLeagues = await prisma.leagues.findMany({
        select: { externalId: true },
      });
      const dbLeagueExternalIds = new Set(
        dbLeagues.map((l) => l.externalId.toString())
      );

      // Fetch leagues from provider to get league details
      const leaguesDto = await adapter.fetchLeagues();
      const leagueMap = new Map(
        leaguesDto.map((l) => [String(l.externalId), l])
      );

      return reply.send({
        status: "success",
        data: seasonsDto.map((s) => {
          const leagueExternalId = s.leagueExternalId
            ? String(s.leagueExternalId)
            : null;
          const leagueInDb = leagueExternalId
            ? dbLeagueExternalIds.has(leagueExternalId)
            : false;

          // Get league data from provider
          const providerLeague = leagueExternalId
            ? leagueMap.get(leagueExternalId)
            : null;

          return {
            externalId: s.externalId,
            name: s.name,
            startDate: s.startDate ?? null,
            endDate: s.endDate ?? null,
            isCurrent: s.isCurrent,
            leagueExternalId: s.leagueExternalId ?? null,
            league: providerLeague
              ? {
                  id: Number(providerLeague.externalId),
                  name: providerLeague.name,
                }
              : null,
            leagueInDb,
            countryName: s.countryName ?? null,
          };
        }),
        message: "Seasons fetched from provider successfully",
        provider: "sportmonks",
      });
    }
  );
};

export default adminSeasonsProviderRoutes;

