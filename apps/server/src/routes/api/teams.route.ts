// src/routes/api/teams.route.ts
// Routes for teams listing (read-only, for pool creation flow).

import { FastifyPluginAsync } from "fastify";
import { getTeams } from "../../services/api/teams";
import type { ApiTeamsResponse, ApiTeamsQuery } from "@repo/types";
import { teamsQuerystringSchema, teamsResponseSchema } from "../../schemas/api";

const teamsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/teams
   *
   * Route mounting: This file is in routes/api/, so Fastify autoload mounts it at /api.
   * The route path "/teams" becomes "/api/teams".
   *
   * - Requires auth + onboarding completion.
   * - Returns paginated list of teams for pool creation.
   * - Supports optional filtering by leagueId.
   */
  fastify.get<{ Querystring: ApiTeamsQuery; Reply: ApiTeamsResponse }>(
    "/teams",
    {
      preHandler: fastify.userAuth.requireOnboardingComplete,
      schema: {
        querystring: teamsQuerystringSchema,
        response: {
          200: teamsResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const q = req.query;
      const page = Math.max(1, Number(q.page ?? 1));
      const perPage = Math.max(1, Math.min(100, Number(q.perPage ?? 20)));
      const leagueId = q.leagueId ? Number(q.leagueId) : undefined;

      if (
        q.leagueId !== undefined &&
        (!Number.isInteger(leagueId) || leagueId! <= 0)
      ) {
        return reply.status(400).send({
          status: "error",
          message: "Invalid 'leagueId'. Must be a positive integer.",
        } as any);
      }

      // Parse includeCountry: can be boolean or string "true"/"false"
      const includeCountry =
        q.includeCountry === true ||
        String(q.includeCountry ?? "").toLowerCase() === "true";

      // Extract preset and search - they are mutually exclusive
      const preset = q.preset === "popular" ? "popular" : undefined;
      const search = q.search ? String(q.search).trim() : undefined;

      // Validate: preset and search cannot be used together
      if (preset && search) {
        return reply.status(400).send({
          status: "error",
          message: "Cannot use both 'preset' and 'search' parameters together.",
        } as any);
      }

      const result = await getTeams({
        page,
        perPage,
        leagueId,
        includeCountry,
        search,
        preset,
      });

      return reply.send(result);
    }
  );
};

console.log("REGISTERING teamsRoutes");
export default teamsRoutes;
