// routes/api/user-stats.route.ts
// Routes for user stats and head-to-head comparison.

import type { FastifyPluginAsync } from "fastify";
import {
  getUserStats,
  getHeadToHead,
  getH2HOpponents,
  getGamificationData,
} from "../../services/api/user-stats";
import type {
  ApiUserStatsResponse,
  ApiHeadToHeadResponse,
  ApiH2HOpponentsResponse,
  ApiGamificationResponse,
} from "@repo/types";
import {
  userStatsParamsSchema,
  userStatsResponseSchema,
  headToHeadParamsSchema,
  headToHeadResponseSchema,
} from "../../schemas/api";

const userStatsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.userAuth.requireOnboardingComplete);

  // GET /api/users/:id/stats
  fastify.get<{ Params: { id: string }; Reply: ApiUserStatsResponse }>(
    "/users/:id/stats",
    {
      schema: {
        params: userStatsParamsSchema,
        response: { 200: userStatsResponseSchema },
      },
    },
    async (req, reply) => {
      const id = Number(req.params.id);
      const result = await getUserStats(id);
      return reply.send(result);
    }
  );

  // GET /api/users/:id/head-to-head/:opponentId
  fastify.get<{
    Params: { id: string; opponentId: string };
    Reply: ApiHeadToHeadResponse;
  }>(
    "/users/:id/head-to-head/:opponentId",
    {
      schema: {
        params: headToHeadParamsSchema,
        response: { 200: headToHeadResponseSchema },
      },
    },
    async (req, reply) => {
      const id = Number(req.params.id);
      const opponentId = Number(req.params.opponentId);
      const result = await getHeadToHead(id, opponentId);
      return reply.send(result);
    }
  );

  // GET /api/users/:id/gamification
  fastify.get<{ Params: { id: string }; Reply: ApiGamificationResponse }>(
    "/users/:id/gamification",
    {
      schema: {
        params: userStatsParamsSchema,
      },
    },
    async (req, reply) => {
      const id = Number(req.params.id);
      const result = await getGamificationData(id);
      return reply.send(result);
    }
  );

  // GET /api/users/:id/h2h-opponents
  fastify.get<{ Params: { id: string }; Reply: ApiH2HOpponentsResponse }>(
    "/users/:id/h2h-opponents",
    {
      schema: {
        params: userStatsParamsSchema,
      },
    },
    async (req, reply) => {
      const id = Number(req.params.id);
      const result = await getH2HOpponents(id);
      return reply.send(result);
    }
  );
};

export default userStatsRoutes;
