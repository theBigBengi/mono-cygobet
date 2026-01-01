// src/routes/admin/provider/fixtures.route.ts
import { FastifyPluginAsync } from "fastify";
import { SportMonksAdapter } from "@repo/sports-data/adapters/sportmonks";
import { AdminProviderFixturesResponse } from "@repo/types";
import { providerResponseSchema } from "../../../schemas/admin.schemas";
import { prisma } from "@repo/db";

const adminFixturesProviderRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /admin/provider/fixtures - Get fixtures from SportMonks provider
  // Note: This endpoint requires date range parameters for fetching fixtures
  fastify.get<{ Reply: AdminProviderFixturesResponse }>(
    "/fixtures",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            from: { type: "string" }, // ISO date string
            to: { type: "string" }, // ISO date string
            seasonId: { type: "number" }, // Optional: fetch fixtures for a specific season
            leagueIds: {
              type: "array",
              items: { type: "number" },
            },
            countryIds: {
              type: "array",
              items: { type: "number" },
            },
          },
        },
        response: {
          200: providerResponseSchema,
        },
      },
    },
    async (req, reply): Promise<AdminProviderFixturesResponse> => {
      const query = req.query as {
        from?: string;
        to?: string;
        seasonId?: number;
        leagueIds?: number[];
        countryIds?: number[];
      };

      // Default to 3 days back and 4 days ahead if not provided
      let fromDate: string;
      let toDate: string;

      if (query.from && query.to) {
        fromDate = query.from;
        toDate = query.to;
      } else {
        const now = new Date();
        const from = new Date(now);
        from.setDate(from.getDate() - 3);
        const to = new Date(now);
        to.setDate(to.getDate() + 4);

        fromDate = from.toISOString().split("T")[0]!;
        toDate = to.toISOString().split("T")[0]!;
      }

      const adapter = new SportMonksAdapter({
        token: process.env.SPORTMONKS_API_TOKEN,
        footballBaseUrl: process.env.SPORTMONKS_FOOTBALL_BASE_URL,
        coreBaseUrl: process.env.SPORTMONKS_CORE_BASE_URL,
        authMode:
          (process.env.SPORTMONKS_AUTH_MODE as "query" | "header") || "query",
      });

      let fixturesDto: any[] = [];
      let fixturesRaw: any[] = [];

      // Access the internal httpFootball instance to get raw data with includes
      const adapterInternal = adapter as any;

      if (query.seasonId) {
        // Fetch fixtures for a specific season
        fixturesDto = await adapter.fetchFixturesBySeason(query.seasonId);
        // Get raw data with league, country, and odds
        const seasonData = await adapterInternal.httpFootball.get(
          `seasons/${query.seasonId}`,
          {
            include: [
              {
                name: "fixtures",
                include: [
                  { name: "state", fields: ["id", "short_name"] },
                  { name: "participants", fields: ["id"] },
                  { name: "round", fields: ["name"] },
                  { name: "stage", fields: ["name"] },
                  {
                    name: "league",
                    include: [{ name: "country" }],
                  },
                  {
                    name: "odds",
                  },
                ],
              },
            ],
            filters: {
              fixtureStates: "1",
            },
          }
        );
        // Flatten the fixtures from season response
        fixturesRaw = seasonData.flatMap(
          (season: any) => season.fixtures || []
        );
      } else {
        // Fetch fixtures between dates - get raw data with league, country, and odds
        fixturesRaw = await adapterInternal.httpFootball.get(
          `fixtures/between/${encodeURIComponent(fromDate)}/${encodeURIComponent(toDate)}`,
          {
            include: [
              {
                name: "participants",
              },
              {
                name: "league",
                include: [{ name: "country" }],
              },
              {
                name: "stage",
                fields: ["name"],
              },
              {
                name: "round",
                fields: ["name"],
              },
              {
                name: "state",
              },
              {
                name: "odds",
              },
            ],
            perPage: 50,
            sortBy: "starting_at",
            order: "asc",
          }
        );
        fixturesDto = await adapter.fetchFixturesBetween(fromDate, toDate);
      }

      // Get leagues and countries from DB for filtering
      const dbLeagues = await prisma.leagues.findMany({
        select: { id: true, externalId: true, countryId: true },
      });
      const dbLeagueExternalIds = new Set(
        dbLeagues.map((l) => l.externalId.toString())
      );
      const leagueIdToExternalId = new Map(
        dbLeagues.map((l) => [l.id, l.externalId.toString()])
      );
      const leagueIdToCountryId = new Map(
        dbLeagues.map((l) => [l.id, l.countryId])
      );

      // Get all season external IDs from DB
      const dbSeasons = await prisma.seasons.findMany({
        select: { externalId: true },
      });
      const dbSeasonExternalIds = new Set(
        dbSeasons.map((s) => s.externalId.toString())
      );

      // Filter by leagueIds if provided
      let filteredFixturesDto = fixturesDto;
      const leagueIds = query.leagueIds;
      if (leagueIds && Array.isArray(leagueIds) && leagueIds.length > 0) {
        const allowedLeagueExternalIds = new Set<string>();
        leagueIds.forEach((id: number) => {
          const extId = leagueIdToExternalId.get(id);
          if (extId) {
            allowedLeagueExternalIds.add(extId);
          }
        });
        filteredFixturesDto = fixturesDto.filter((f) => {
          const leagueExternalId = f.leagueExternalId
            ? String(f.leagueExternalId)
            : null;
          return (
            leagueExternalId && allowedLeagueExternalIds.has(leagueExternalId)
          );
        });
      }

      // Filter by countryIds if provided
      const countryIds = query.countryIds;
      if (countryIds && Array.isArray(countryIds) && countryIds.length > 0) {
        const allowedCountryIds = new Set(countryIds);
        filteredFixturesDto = filteredFixturesDto.filter((f) => {
          // Find the league ID from external ID
          const leagueExternalId = f.leagueExternalId
            ? String(f.leagueExternalId)
            : null;
          if (!leagueExternalId) return false;

          // Find the league in DB by external ID
          const league = dbLeagues.find(
            (l) => l.externalId.toString() === leagueExternalId
          );
          if (!league || !league.countryId) return false;

          return allowedCountryIds.has(league.countryId);
        });
      }

      // Create a map of fixture external IDs to raw fixture data
      const rawFixtureMap = new Map<number, any>();
      fixturesRaw.forEach((f: any) => {
        rawFixtureMap.set(Number(f.id), f);
      });

      return reply.send({
        status: "success",
        data: filteredFixturesDto.map((f) => {
          const leagueExternalId = f.leagueExternalId
            ? String(f.leagueExternalId)
            : null;
          const seasonExternalId = f.seasonExternalId
            ? String(f.seasonExternalId)
            : null;
          const homeTeamExternalId = String(f.homeTeamExternalId);
          const awayTeamExternalId = String(f.awayTeamExternalId);

          // Get raw fixture data for league, country, and odds
          const rawFixture = rawFixtureMap.get(f.externalId);
          const leagueName = rawFixture?.league?.name ?? null;
          const countryName = rawFixture?.league?.country?.name ?? null;
          const hasOdds =
            rawFixture?.odds &&
            Array.isArray(rawFixture.odds) &&
            rawFixture.odds.length > 0;

          return {
            externalId: f.externalId,
            name: f.name,
            startIso: f.startIso ?? null,
            startTs: f.startTs,
            state: f.state,
            result: f.result ?? null,
            stageRoundName: f.stageRoundName ?? null,
            leagueExternalId: f.leagueExternalId ?? null,
            seasonExternalId: f.seasonExternalId ?? null,
            homeTeamExternalId: f.homeTeamExternalId,
            awayTeamExternalId: f.awayTeamExternalId,
            leagueInDb: leagueExternalId
              ? dbLeagueExternalIds.has(leagueExternalId)
              : false,
            seasonInDb: seasonExternalId
              ? dbSeasonExternalIds.has(seasonExternalId)
              : false,
            leagueName,
            countryName,
            hasOdds: hasOdds ?? false,
          };
        }),
        message: "Fixtures fetched from provider successfully",
        provider: "sportmonks",
      });
    }
  );
};

export default adminFixturesProviderRoutes;
