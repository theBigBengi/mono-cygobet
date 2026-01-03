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
            leagueIds: { type: "string" }, // Comma-separated string of external IDs
            countryIds: { type: "string" }, // Comma-separated string of external IDs
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
        leagueIds?: string; // Comma-separated string of external IDs
        countryIds?: string; // Comma-separated string of external IDs
      };

      // Default to 3 days back and 4 days ahead if not provided
      let fromDate: string;
      let toDate: string;
      let fromDateOnly: string;
      let toDateOnly: string;

      if (query.from && query.to) {
        // Extract date-only part (YYYY-MM-DD) - avoid timezone issues
        // If the string already contains time, extract just the date part
        fromDateOnly = query.from.split("T")[0]!.split(" ")[0]!;
        toDateOnly = query.to.split("T")[0]!.split(" ")[0]!;

        // For SportMonks API, use date-only format (YYYY-MM-DD) in the URL path
        // The API expects dates in YYYY-MM-DD format, not full ISO strings
        fromDate = fromDateOnly;
        toDate = toDateOnly;
      } else {
        const now = new Date();
        const from = new Date(now);
        from.setDate(from.getDate() - 3);
        from.setHours(0, 0, 0, 0);
        const to = new Date(now);
        to.setDate(to.getDate() + 4);
        to.setHours(23, 59, 59, 999);

        // Extract date-only (YYYY-MM-DD) for API calls
        fromDateOnly = from.toISOString().split("T")[0]!;
        toDateOnly = to.toISOString().split("T")[0]!;
        fromDate = fromDateOnly;
        toDate = toDateOnly;
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

      // Store original fixturesRaw BEFORE any filtering - we need this for odds lookup
      const originalFixturesRaw = [...fixturesRaw];

      // Filter fixtures by date range to ensure they're within the requested range
      // Compare dates only (YYYY-MM-DD) to avoid timezone issues
      // fromDateOnly and toDateOnly are already set above

      // fixturesDto = fixturesDto.filter((f) => {
      //   if (!f.startIso) return false;
      //   // Extract date part (YYYY-MM-DD) from ISO string
      //   const fixtureDateOnly = f.startIso.split("T")[0]!;
      //   return fixtureDateOnly >= fromDateOnly && fixtureDateOnly <= toDateOnly;
      // });

      // Also filter fixturesRaw to match
      fixturesRaw = fixturesRaw.filter((rf: any) => {
        if (!rf.starting_at) return false;
        // Extract date part (YYYY-MM-DD) from ISO string
        const fixtureDateOnly = rf.starting_at.split("T")[0]!;
        return fixtureDateOnly >= fromDateOnly && fixtureDateOnly <= toDateOnly;
      });

      // Get leagues and countries from DB for filtering
      const dbLeagues = await prisma.leagues.findMany({
        select: { id: true, externalId: true, countryId: true },
      });
      const dbLeagueExternalIds = new Set(
        dbLeagues.map((l) => l.externalId.toString())
      );

      // Get all season external IDs from DB
      const dbSeasons = await prisma.seasons.findMany({
        select: { externalId: true },
      });
      const dbSeasonExternalIds = new Set(
        dbSeasons.map((s) => s.externalId.toString())
      );

      // Filter by leagueIds if provided (external IDs)
      let filteredFixturesDto = fixturesDto;
      const leagueIdsStr = query.leagueIds;
      if (leagueIdsStr) {
        const leagueExternalIds = leagueIdsStr
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);
        if (leagueExternalIds.length > 0) {
          const allowedLeagueExternalIds = new Set(leagueExternalIds);
          filteredFixturesDto = fixturesDto.filter((f) => {
            const leagueExternalId = f.leagueExternalId
              ? String(f.leagueExternalId)
              : null;
            return (
              leagueExternalId && allowedLeagueExternalIds.has(leagueExternalId)
            );
          });
          // Also filter fixturesRaw by league
          fixturesRaw = fixturesRaw.filter((rf: any) => {
            const leagueExternalId = rf.league?.id
              ? String(rf.league.id)
              : null;
            return (
              leagueExternalId && allowedLeagueExternalIds.has(leagueExternalId)
            );
          });
        }
      }

      // Filter by countryIds if provided (external IDs)
      const countryIdsStr = query.countryIds;
      if (countryIdsStr) {
        const countryExternalIds = countryIdsStr
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);
        if (countryExternalIds.length > 0) {
          const allowedCountryExternalIds = new Set(countryExternalIds);

          // Create a map of fixture external IDs to country external IDs from raw data
          const fixtureCountryMap = new Map<number, string>();
          fixturesRaw.forEach((rf: any) => {
            if (rf.id && rf.league?.country?.id) {
              fixtureCountryMap.set(
                Number(rf.id),
                String(rf.league.country.id)
              );
            }
          });

          // Filter by country external ID from provider data
          filteredFixturesDto = filteredFixturesDto.filter((f) => {
            const countryExternalId = fixtureCountryMap.get(f.externalId);
            return (
              countryExternalId &&
              allowedCountryExternalIds.has(countryExternalId)
            );
          });
          // Also filter fixturesRaw by country
          fixturesRaw = fixturesRaw.filter((rf: any) => {
            const countryExternalId = rf.league?.country?.id
              ? String(rf.league.country.id)
              : null;
            return (
              countryExternalId &&
              allowedCountryExternalIds.has(countryExternalId)
            );
          });
        }
      }

      // Create a map of fixture external IDs to raw fixture data
      // Build map from ORIGINAL fixturesRaw (before filtering) to ensure we have odds data for ALL fixtures
      // This way, even if fixturesRaw gets filtered, we can still look up odds for any fixture in fixturesDto
      const rawFixtureMap = new Map<number, any>();
      originalFixturesRaw.forEach((f: any) => {
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
          // Look up using the external ID as a number to match the map key
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
