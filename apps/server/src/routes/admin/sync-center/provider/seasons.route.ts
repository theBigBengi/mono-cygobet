// src/routes/admin/provider/seasons.route.ts
import { FastifyPluginAsync } from "fastify";
import { adapter, currentProviderLabel } from "../../../../utils/adapter";
import { AdminProviderSeasonsResponse } from "@repo/types";
import { providerResponseSchema } from "../../../../schemas/admin/admin.schemas";
import { prisma } from "@repo/db";

const adminSeasonsProviderRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /admin/seasons/provider - Get seasons from sports-data provider
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
      // Fetch seasons from provider (includes league.country data)
      const seasonsDto = await adapter.fetchSeasons();

      // Get all league external IDs from DB to check availability
      const dbLeagues = await prisma.leagues.findMany({
        select: { externalId: true },
      });
      const dbLeagueExternalIds = new Set(
        dbLeagues.map((l) => l.externalId.toString())
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

          return {
            externalId: s.externalId,
            name: s.name,
            startDate: s.startDate ?? null,
            endDate: s.endDate ?? null,
            isCurrent: s.isCurrent,
            leagueExternalId: s.leagueExternalId ?? null,
            // League data already included in season response
            league: s.leagueExternalId
              ? {
                  id: Number(s.leagueExternalId),
                  name: s.leagueName ?? "",
                }
              : null,
            leagueInDb,
            countryName: s.countryName ?? null,
          };
        }),
        message: "Seasons fetched from provider successfully",
        provider: currentProviderLabel,
      });
    }
  );
};

export default adminSeasonsProviderRoutes;

