// src/routes/admin/provider/teams.route.ts
import { FastifyPluginAsync } from "fastify";
import { adapter } from "../../../../utils/adapter";
import { AdminProviderTeamsResponse } from "@repo/types";
import { providerResponseSchema } from "../../../../schemas/admin/admin.schemas";
import { prisma } from "@repo/db";

const adminTeamsProviderRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /admin/teams/provider - Get teams from sports-data provider
  fastify.get<{ Reply: AdminProviderTeamsResponse }>(
    "/teams",
    {
      schema: {
        response: {
          200: providerResponseSchema,
        },
      },
    },
    async (req, reply): Promise<AdminProviderTeamsResponse> => {
      // Fetch teams from provider
      const teamsDto = await adapter.fetchTeams();

      // Get all countries with leagues from DB to check if country has leagues
      const dbCountriesWithLeagues = await prisma.countries.findMany({
        where: {
          leagues: {
            some: {},
          },
        },
        select: { externalId: true },
      });
      const dbCountryExternalIdsWithLeagues = new Set(
        dbCountriesWithLeagues.map((c) => c.externalId.toString())
      );

      // Fetch countries from provider to get country details
      const countriesDto = await adapter.fetchCountries();
      const countryMap = new Map(
        countriesDto.map((c) => [String(c.externalId), c])
      );

      return reply.send({
        status: "success",
        data: teamsDto.map((t) => {
          const countryExternalId = t.countryExternalId
            ? String(t.countryExternalId)
            : null;
          const leagueInDb = countryExternalId
            ? dbCountryExternalIdsWithLeagues.has(countryExternalId)
            : false;

          // Get country data from provider
          const providerCountry = countryExternalId
            ? countryMap.get(countryExternalId)
            : null;

          return {
            externalId: t.externalId,
            name: t.name,
            imagePath: t.imagePath ?? null,
            countryExternalId: t.countryExternalId ?? null,
            country: providerCountry
              ? {
                  id: Number(providerCountry.externalId),
                  name: providerCountry.name,
                  imagePath: providerCountry.imagePath ?? null,
                  iso2: providerCountry.iso2 ?? null,
                  iso3: providerCountry.iso3 ?? null,
                }
              : null,
            leagueInDb,
            shortCode: t.shortCode ?? null,
            founded: t.founded ?? null,
            type: t.type ?? null,
          };
        }),
        message: "Teams fetched from provider successfully",
        provider: "sportmonks",
      });
    }
  );
};

export default adminTeamsProviderRoutes;
