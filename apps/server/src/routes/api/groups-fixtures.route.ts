// src/routes/api/groups-fixtures.route.ts
// Routes for group fixtures and game filters.

import type { FastifyPluginAsync } from "fastify";
import {
  getGroupFixtures,
  getGroupGamesFilters,
} from "../../services/api/groups";
import type {
  ApiGroupFixturesResponse,
  ApiGroupGamesFiltersResponse,
} from "@repo/types";
import {
  getGroupParamsSchema,
  groupFixturesResponseSchema,
  groupFixturesFilterQuerystringSchema,
  groupGamesFiltersResponseSchema,
} from "../../schemas/api";
import { parseGroupFixturesFilter } from "../../utils/routes";

const fixturesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.userAuth.requireOnboardingComplete);

  // GET /api/groups/:id/fixtures
  fastify.get<{
    Params: { id: number };
    Querystring: Record<string, unknown>;
    Reply: ApiGroupFixturesResponse;
  }>(
    "/groups/:id/fixtures",
    {
      schema: {
        params: getGroupParamsSchema,
        querystring: groupFixturesFilterQuerystringSchema,
        response: { 200: groupFixturesResponseSchema },
      },
    },
    async (req, reply) => {
      const id = Number(req.params.id);
      const userId = req.userAuth!.user.id;
      const filters = parseGroupFixturesFilter(
        req.query as Record<string, unknown>
      );
      const result = await getGroupFixtures(id, userId, filters);
      return reply.send(result);
    }
  );

  // GET /api/groups/:id/games-filters
  fastify.get<{
    Params: { id: number };
    Reply: ApiGroupGamesFiltersResponse;
  }>(
    "/groups/:id/games-filters",
    {
      schema: {
        params: getGroupParamsSchema,
        response: { 200: groupGamesFiltersResponseSchema },
      },
    },
    async (req, reply) => {
      const id = Number(req.params.id);
      const userId = req.userAuth!.user.id;
      const result = await getGroupGamesFilters(id, userId);
      return reply.send(result);
    }
  );
};

export default fixturesRoutes;
