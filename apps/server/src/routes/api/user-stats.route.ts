// routes/api/user-stats.route.ts
// Routes for user stats and head-to-head comparison.
// Mounted under /api by Fastify autoload.

import { FastifyPluginAsync } from "fastify";
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
  /**
   * GET /api/users/:id/stats
   *
   * - Requires auth + onboarding completion.
   * - Returns stats, badges, form, and per-group breakdown for the user.
   */
  fastify.get<{
    Params: { id: string };
    Reply: ApiUserStatsResponse;
  }>(
    "/users/:id/stats",
    {
      preHandler: [fastify.userAuth.requireOnboardingComplete],
      schema: {
        params: userStatsParamsSchema,
        response: { 200: userStatsResponseSchema },
      },
    },
    async (req, reply) => {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return reply.status(400).send({
          status: "error",
          message: "Invalid user ID",
        } as any);
      }
      const result = await getUserStats(id);
      return reply.send(result);
    }
  );

  /**
   * GET /api/users/:id/head-to-head/:opponentId
   *
   * - Requires auth + onboarding completion.
   * - Returns head-to-head comparison between two users in shared groups.
   */
  fastify.get<{
    Params: { id: string; opponentId: string };
    Reply: ApiHeadToHeadResponse;
  }>(
    "/users/:id/head-to-head/:opponentId",
    {
      preHandler: [fastify.userAuth.requireOnboardingComplete],
      schema: {
        params: headToHeadParamsSchema,
        response: { 200: headToHeadResponseSchema },
      },
    },
    async (req, reply) => {
      const id = Number(req.params.id);
      const opponentId = Number(req.params.opponentId);
      if (
        !Number.isInteger(id) ||
        id <= 0 ||
        !Number.isInteger(opponentId) ||
        opponentId <= 0
      ) {
        return reply.status(400).send({
          status: "error",
          message: "Invalid user or opponent ID",
        } as any);
      }
      const result = await getHeadToHead(id, opponentId);
      return reply.send(result);
    }
  );

  /**
   * GET /api/users/:id/gamification
   *
   * - Requires auth + onboarding completion.
   * - Returns power score, rank tier, skills radar, streak, season comparison.
   */
  fastify.get<{
    Params: { id: string };
    Reply: ApiGamificationResponse;
  }>(
    "/users/:id/gamification",
    {
      preHandler: [fastify.userAuth.requireOnboardingComplete],
      schema: {
        params: userStatsParamsSchema,
      },
    },
    async (req, reply) => {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return reply.status(400).send({
          status: "error",
          message: "Invalid user ID",
        } as any);
      }
      const result = await getGamificationData(id);
      return reply.send(result);
    }
  );

  /**
   * GET /api/users/:id/h2h-opponents
   *
   * - Returns users who share at least one group with the given user.
   */
  fastify.get<{
    Params: { id: string };
    Reply: ApiH2HOpponentsResponse;
  }>(
    "/users/:id/h2h-opponents",
    {
      preHandler: [fastify.userAuth.requireOnboardingComplete],
      schema: {
        params: userStatsParamsSchema,
      },
    },
    async (req, reply) => {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return reply.status(400).send({
          status: "error",
          message: "Invalid user ID",
        } as any);
      }
      const result = await getH2HOpponents(id);
      return reply.send(result);
    }
  );
};

export default userStatsRoutes;
