// src/routes/admin/provider/standings.route.ts
import { FastifyPluginAsync } from "fastify";
import { adapter, currentProviderLabel } from "../../../../utils/adapter";
import { providerResponseSchema } from "../../../../schemas/admin/admin.schemas";

interface StandingsResponse {
  status: "success" | "error";
  data: Array<{
    position: number;
    teamExternalId: number;
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
  message: string;
  provider: string;
}

const adminStandingsProviderRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /admin/provider/standings/season/:seasonId - Get standings from sports-data provider by season
  fastify.get<{
    Params: { seasonId: string };
    Reply: StandingsResponse;
  }>(
    "/standings/season/:seasonId",
    {
      schema: {
        params: {
          type: "object",
          properties: {
            seasonId: { type: "string" },
          },
          required: ["seasonId"],
        },
        response: {
          200: providerResponseSchema,
        },
      },
    },
    async (req, reply): Promise<StandingsResponse> => {
      const { seasonId } = req.params;

      const seasonIdNum = Number(seasonId);
      if (isNaN(seasonIdNum)) {
        return reply.code(400).send({
          status: "error",
          data: [],
          message: `Invalid season ID: ${seasonId}`,
          provider: currentProviderLabel,
        });
      }

      if (!adapter.fetchStandingsBySeason) {
        return reply.code(501).send({
          status: "error",
          data: [],
          message: "Standings not supported by current provider",
          provider: currentProviderLabel,
        });
      }

      const standings = await adapter.fetchStandingsBySeason(seasonIdNum);

      return reply.send({
        status: "success",
        data: standings.map((s) => ({
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
        message: `Standings fetched from provider successfully for season ${seasonId}`,
        provider: currentProviderLabel,
      });
    }
  );
};

export default adminStandingsProviderRoutes;
