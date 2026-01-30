// src/routes/admin/provider/countries.route.ts
import { FastifyPluginAsync } from "fastify";
import { adapter } from "../../../../utils/adapter";
import { AdminProviderCountriesResponse } from "@repo/types";
import { providerResponseSchema } from "../../../../schemas/admin/admin.schemas";

const adminCountriesProviderRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /admin/countries/provider - Get countries from sports-data provider
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
      const [countries, leagues] = await Promise.all([
        adapter.fetchCountries(),
        adapter.fetchLeagues(),
      ]);

      const leaguesCountByCountryId = leagues.reduce<Record<string, number>>(
        (acc, league) => {
          const key = String(league.countryExternalId ?? "");
          acc[key] = (acc[key] ?? 0) + 1;
          return acc;
        },
        {}
      );

      const data = countries.map((c) => {
        const countryKey = String(c.externalId);
        return {
          externalId: c.externalId,
          name: c.name,
          imagePath: c.imagePath ?? null,
          iso2: c.iso2 ?? null,
          iso3: c.iso3 ?? null,
          availableLeaguesCount: leaguesCountByCountryId[countryKey] ?? 0,
        };
      });

      return reply.send({
        status: "success",
        data,
        message: "Countries fetched from provider successfully",
        provider: "sportmonks",
      });
    }
  );
};

export default adminCountriesProviderRoutes;
