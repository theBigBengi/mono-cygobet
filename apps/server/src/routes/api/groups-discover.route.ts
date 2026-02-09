// src/routes/api/groups-discover.route.ts
// Routes for public group discovery and joining by invite code.
// These are static /groups/* routes that must be registered before /groups/:id.

import type { FastifyPluginAsync } from "fastify";
import {
  getPublicGroups,
  joinGroupByCode,
  getGroupPreview,
} from "../../services/api/groups";
import type {
  ApiPublicGroupsQuery,
  ApiPublicGroupsResponse,
  ApiJoinGroupByCodeBody,
  ApiGroupResponse,
  ApiGroupPreviewBody,
  ApiGroupPreviewResponse,
} from "@repo/types";
import {
  groupResponseSchema,
  publicGroupsQuerystringSchema,
  publicGroupsResponseSchema,
  joinGroupByCodeBodySchema,
  groupPreviewBodySchema,
  groupPreviewResponseSchema,
} from "../../schemas/api";

const discoverRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.userAuth.requireOnboardingComplete);

  // POST /api/groups/join — join a group by invite code
  fastify.post<{
    Body: ApiJoinGroupByCodeBody;
    Reply: ApiGroupResponse;
  }>(
    "/groups/join",
    {
      schema: {
        body: joinGroupByCodeBodySchema,
        response: { 200: groupResponseSchema },
      },
    },
    async (req, reply) => {
      const userId = req.userAuth!.user.id;
      const { code } = req.body;
      const result = await joinGroupByCode(code, userId, fastify.io);
      return reply.send(result);
    }
  );

  // GET /api/groups/public — paginated list of public active groups
  fastify.get<{
    Querystring: ApiPublicGroupsQuery;
    Reply: ApiPublicGroupsResponse;
  }>(
    "/groups/public",
    {
      schema: {
        querystring: publicGroupsQuerystringSchema,
        response: { 200: publicGroupsResponseSchema },
      },
    },
    async (req, reply) => {
      const userId = req.userAuth!.user.id;
      const page = req.query.page != null ? Number(req.query.page) : undefined;
      const perPage =
        req.query.perPage != null ? Number(req.query.perPage) : undefined;
      const search = req.query.search;
      const result = await getPublicGroups({ page, perPage, search }, userId);
      return reply.send(result);
    }
  );

  // POST /api/groups/preview — simulate fixture resolution (read-only)
  fastify.post<{
    Body: ApiGroupPreviewBody;
    Reply: ApiGroupPreviewResponse;
  }>(
    "/groups/preview",
    {
      schema: {
        body: groupPreviewBodySchema,
        response: { 200: groupPreviewResponseSchema },
      },
    },
    async (req, reply) => {
      const { selectionMode, fixtureIds, teamIds, leagueIds } = req.body;
      const result = await getGroupPreview({
        selectionMode,
        fixtureIds,
        teamIds,
        leagueIds,
      });
      return reply.send(result);
    }
  );
};

export default discoverRoutes;
