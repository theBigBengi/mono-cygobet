// src/routes/api/leagues.route.ts
// Routes for leagues listing (read-only, for pool creation flow).

import { FastifyPluginAsync } from "fastify";
import { getLeagues } from "../../services/api/api.leagues.service";
import type { ApiLeaguesResponse, ApiLeaguesQuery } from "@repo/types";
import {
  leaguesQuerystringSchema,
  leaguesResponseSchema,
} from "../../schemas/api";

const leaguesRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/leagues
   *
   * Route mounting: This file is in routes/api/, so Fastify autoload mounts it at /api.
   * The route path "/leagues" becomes "/api/leagues".
   *
   * - Requires auth + onboarding completion.
   * - Returns paginated list of leagues for pool creation.
   */
  fastify.get<{ Querystring: ApiLeaguesQuery; Reply: ApiLeaguesResponse }>(
    "/leagues",
    {
      preHandler: fastify.userAuth.requireOnboardingComplete,
      schema: {
        querystring: leaguesQuerystringSchema,
        response: {
          200: leaguesResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const q = req.query as ApiLeaguesQuery;
      const page = Math.max(1, Number(q.page ?? 1));
      const perPage = Math.max(1, Math.min(100, Number(q.perPage ?? 20)));

      // Parse includeSeasons: can be boolean or string "true"/"false"
      const includeSeasons =
        q.includeSeasons === true ||
        String(q.includeSeasons ?? "").toLowerCase() === "true";

      // Parse onlyActiveSeasons: can be boolean or string "true"/"false"
      const onlyActiveSeasons =
        q.onlyActiveSeasons === true ||
        String(q.onlyActiveSeasons ?? "").toLowerCase() === "true";

      const result = await getLeagues({
        page,
        perPage,
        includeSeasons,
        onlyActiveSeasons,
      });

      return reply.send(result);
    }
  );
};

export default leaguesRoutes;
