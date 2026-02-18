// routes/api/users-preferences.route.ts
// User preferences routes (league order, etc.).

import { FastifyPluginAsync } from "fastify";
import type { ApiUserLeaguePreferencesResponse } from "@repo/types";
import {
  getEffectiveLeagueOrder,
  updateUserLeaguePreferences,
  resetUserLeaguePreferences,
} from "../../services/api/users/preferences.service";

const usersPreferencesRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/users/preferences/league-order — get user's league order
  fastify.get<{ Reply: ApiUserLeaguePreferencesResponse }>(
    "/users/preferences/league-order",
    {
      preHandler: [fastify.userAuth.requireOnboardingComplete],
    },
    async (req, reply) => {
      const ctx = req.userAuth;
      if (!ctx) throw new Error("User auth context missing");

      const leagueOrder = await getEffectiveLeagueOrder(ctx.user.id);
      return reply.send({
        status: "success",
        data: { leagueOrder },
        message: "OK",
      });
    }
  );

  // PUT /api/users/preferences/league-order — update user's league order
  fastify.put<{
    Body: { leagueOrder: number[] };
    Reply: ApiUserLeaguePreferencesResponse;
  }>(
    "/users/preferences/league-order",
    {
      preHandler: [fastify.userAuth.requireOnboardingComplete],
    },
    async (req, reply) => {
      const ctx = req.userAuth;
      if (!ctx) throw new Error("User auth context missing");

      const { leagueOrder } = req.body;

      // Validate input
      if (!Array.isArray(leagueOrder)) {
        return reply.status(400).send({
          status: "error",
          data: { leagueOrder: null },
          message: "leagueOrder must be an array of numbers",
        } as unknown as ApiUserLeaguePreferencesResponse);
      }

      if (!leagueOrder.every((id) => typeof id === "number" && Number.isInteger(id) && id > 0)) {
        return reply.status(400).send({
          status: "error",
          data: { leagueOrder: null },
          message: "leagueOrder must contain only positive integers",
        } as unknown as ApiUserLeaguePreferencesResponse);
      }

      try {
        const data = await updateUserLeaguePreferences(ctx.user.id, leagueOrder);
        return reply.send({
          status: "success",
          data,
          message: "League order updated",
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update league order";
        return reply.status(400).send({
          status: "error",
          data: { leagueOrder: null },
          message,
        } as unknown as ApiUserLeaguePreferencesResponse);
      }
    }
  );

  // DELETE /api/users/preferences/league-order — reset to default
  fastify.delete<{ Reply: ApiUserLeaguePreferencesResponse }>(
    "/users/preferences/league-order",
    {
      preHandler: [fastify.userAuth.requireOnboardingComplete],
    },
    async (req, reply) => {
      const ctx = req.userAuth;
      if (!ctx) throw new Error("User auth context missing");

      const data = await resetUserLeaguePreferences(ctx.user.id);
      return reply.send({
        status: "success",
        data,
        message: "League order reset to default",
      });
    }
  );
};

export default usersPreferencesRoutes;
