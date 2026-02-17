// src/routes/admin/provider/fixtures-season.route.ts
import { FastifyPluginAsync } from "fastify";
import { adapter, currentProviderLabel } from "../../../../utils/adapter";
import { AdminProviderFixturesResponse } from "@repo/types";
import { providerResponseSchema } from "../../../../schemas/admin/admin.schemas";
import { prisma } from "@repo/db";

const adminFixturesSeasonProviderRoutes: FastifyPluginAsync = async (
  fastify
) => {
  // GET /admin/provider/fixtures/season/:seasonId - Get fixtures from sports-data provider by season ID
  fastify.get<{
    Params: { seasonId: string };
    Querystring: {
      leagueIds?: string; // Comma-separated string of external IDs
      countryIds?: string; // Comma-separated string of external IDs
    };
    Reply: AdminProviderFixturesResponse;
  }>(
    "/fixtures/season/:seasonId",
    {
      schema: {
        params: {
          type: "object",
          properties: {
            seasonId: { type: "string" },
          },
          required: ["seasonId"],
        },
        querystring: {
          type: "object",
          properties: {
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
      const { seasonId } = req.params;
      const query = req.query as {
        leagueIds?: string;
        countryIds?: string;
      };

      const seasonIdNum = Number(seasonId);
      if (isNaN(seasonIdNum)) {
        return reply.code(400).send({
          status: "error",
          data: [],
          message: `Invalid season ID: ${seasonId}`,
          provider: currentProviderLabel,
        });
      }

      // Fetch fixtures for the specific season (with league, country, odds for filtering)
      // countryExternalId is now included in FixtureDTO from league.country include
      const fixturesDto = await adapter.fetchFixturesBySeason(seasonIdNum, {
        includeOdds: true,
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
          filteredFixturesDto = filteredFixturesDto.filter((f) => {
            // countryExternalId is now directly available in FixtureDTO
            const countryExternalId = f.countryExternalId
              ? String(f.countryExternalId)
              : null;
            return (
              countryExternalId &&
              allowedCountryExternalIds.has(countryExternalId)
            );
          });
        }
      }

      return reply.send({
        status: "success",
        data: filteredFixturesDto.map((f) => {
          const leagueExternalId = f.leagueExternalId
            ? String(f.leagueExternalId)
            : null;
          const seasonExternalId = f.seasonExternalId
            ? String(f.seasonExternalId)
            : null;

          return {
            externalId: f.externalId,
            name: f.name,
            startIso: f.startIso ?? null,
            startTs: f.startTs,
            state: f.state,
            liveMinute: f.liveMinute ?? null,
            result: f.result ?? null,
            homeScore: f.homeScore ?? f.homeScore90 ?? null,
            awayScore: f.awayScore ?? f.awayScore90 ?? null,
            homeScore90: f.homeScore90 ?? null,
            awayScore90: f.awayScore90 ?? null,
            stage: f.stage ?? null,
            round: f.round ?? null,
            leg: f.leg ?? null,
            aggregateId: f.aggregateId ?? null,
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
            leagueName: f.leagueName ?? null,
            countryName: f.countryName ?? null,
            countryExternalId: f.countryExternalId ?? null,
            hasOdds: f.hasOdds ?? false,
          };
        }),
        message: `Fixtures fetched from provider successfully for season ${seasonId}`,
        provider: currentProviderLabel,
      });
    }
  );
};

export default adminFixturesSeasonProviderRoutes;
