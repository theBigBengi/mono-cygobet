// src/routes/api/standings.route.ts
// Routes for league standings (read-only).

import { FastifyPluginAsync } from "fastify";
import { adapter } from "../../utils/adapter";

interface StandingsParams {
  seasonId: string;
}

interface StandingsResponse {
  standings: Array<{
    position: number;
    teamExternalId: string | number;
    teamName: string;
    teamImagePath: string | null;
    teamShortCode: string | null;
    points: number;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
  }>;
}

const standingsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/standings/season/:seasonId
   *
   * Returns league standings for a specific season.
   * Fetches directly from provider (always fresh data).
   */
  fastify.get<{ Params: StandingsParams; Reply: StandingsResponse }>(
    "/standings/season/:seasonId",
    {
      preHandler: fastify.userAuth.requireOnboardingComplete,
      schema: {
        params: {
          type: "object",
          properties: {
            seasonId: { type: "string" },
          },
          required: ["seasonId"],
        },
      },
    },
    async (req, reply) => {
      const { seasonId } = req.params;
      const seasonIdNum = Number(seasonId);

      if (isNaN(seasonIdNum)) {
        return reply.code(400).send({ standings: [] });
      }

      const standings = await adapter.fetchStandingsBySeason(seasonIdNum);

      return reply.send({
        standings: standings.map((s) => ({
          position: s.position,
          teamExternalId: s.teamExternalId,
          teamName: s.teamName,
          teamImagePath: s.teamImagePath,
          teamShortCode: s.teamShortCode,
          points: s.points,
          played: s.played,
          won: s.won,
          drawn: s.drawn,
          lost: s.lost,
          goalsFor: s.goalsFor,
          goalsAgainst: s.goalsAgainst,
          goalDifference: s.goalDifference,
        })),
      });
    }
  );
};

export default standingsRoutes;
