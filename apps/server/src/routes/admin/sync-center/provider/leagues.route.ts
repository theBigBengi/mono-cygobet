// src/routes/admin/provider/leagues.route.ts
import { FastifyPluginAsync } from "fastify";
import { adapter } from "../../../../utils/adapter";
import { AdminProviderLeaguesResponse } from "@repo/types";
import { providerResponseSchema } from "../../../../schemas/admin/admin.schemas";
import { prisma } from "@repo/db";

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
      const leaguesDto = await adapter.fetchLeagues();

      // Get all country external IDs from DB to check availability
      const dbCountries = await prisma.countries.findMany({
        select: { externalId: true },
      });
      const dbCountryExternalIds = new Set(
        dbCountries.map((c) => c.externalId.toString())
      );

      return reply.send({
        status: "success",
        data: leaguesDto.map((l) => {
          const countryExternalId = l.countryExternalId
            ? String(l.countryExternalId)
            : null;
          const countryInDb = countryExternalId
            ? dbCountryExternalIds.has(countryExternalId)
            : false;

          return {
            externalId: l.externalId,
            name: l.name,
            imagePath: l.imagePath ?? null,
            countryExternalId: l.countryExternalId ?? null,
            country: null,
            countryInDb,
            shortCode: l.shortCode ?? null,
            type: l.type ?? null,
            subType: l.subType ?? null,
          };
        }),
        message: "Leagues fetched from provider successfully",
        provider: "sportmonks",
      });
    }
  );
};

export default adminLeaguesProviderRoutes;
