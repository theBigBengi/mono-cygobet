// src/routes/admin/provider/leagues.route.ts
import { FastifyPluginAsync } from "fastify";
import { SportMonksAdapter } from "@repo/sports-data/adapters/sportmonks";
import { AdminProviderLeaguesResponse } from "@repo/types";
import { providerResponseSchema } from "../../../schemas/admin.schemas";
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
      const adapter = new SportMonksAdapter({
        token: process.env.SPORTMONKS_API_TOKEN,
        footballBaseUrl: process.env.SPORTMONKS_FOOTBALL_BASE_URL,
        coreBaseUrl: process.env.SPORTMONKS_CORE_BASE_URL,
        authMode:
          (process.env.SPORTMONKS_AUTH_MODE as "query" | "header") || "query",
      });

      // Fetch leagues with country included (adapter returns formatted country data)
      const leaguesDto = await adapter.fetchLeagues({
        include: [
          {
            name: "country",
            fields: ["id", "name", "image_path", "iso2", "iso3"],
          },
        ],
      });

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
            country: l.country ?? null, // Adapter already formats the country data
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
