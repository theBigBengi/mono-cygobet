// src/routes/api/users-search.route.ts
// GET /api/users/search — search users by username (for group invites).

import type { FastifyPluginAsync } from "fastify";
import { searchUsers, getSuggestedUsers } from "../../services/api/users/search-users";
import type { ApiUsersSearchResponse } from "@repo/types";
import {
  usersSearchQuerystringSchema,
  usersSearchResponseSchema,
} from "../../schemas/api";

const MIN_QUERY_LENGTH = 3;

const usersSearchRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.userAuth.requireOnboardingComplete);

  fastify.get<{
    Querystring: {
      q: string;
      excludeGroupId?: string;
      page?: string;
      perPage?: string;
    };
    Reply: ApiUsersSearchResponse;
  }>(
    "/users/search",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
      schema: {
        querystring: usersSearchQuerystringSchema,
        response: { 200: usersSearchResponseSchema },
      },
    },
    async (req, reply) => {
      const q = (req.query.q ?? "").trim();
      if (q.length < MIN_QUERY_LENGTH) {
        return reply.status(400).send({
          status: "error",
          message: "Search query must be at least 3 characters",
        } as any);
      }
      const userId = req.userAuth!.user.id;
      const excludeGroupId = req.query.excludeGroupId
        ? Number(req.query.excludeGroupId)
        : undefined;
      const page = req.query.page ? Number(req.query.page) : undefined;
      const perPage = req.query.perPage ? Number(req.query.perPage) : undefined;
      const result = await searchUsers({
        q,
        excludeGroupId: Number.isNaN(excludeGroupId)
          ? undefined
          : excludeGroupId,
        userId,
        page,
        perPage,
      });
      return reply.send(result);
    }
  );

  // GET /api/users/suggested - get suggested users from shared private groups
  fastify.get<{
    Querystring: {
      excludeGroupId?: string;
    };
    Reply: ApiUsersSearchResponse;
  }>(
    "/users/suggested",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
      schema: {
        response: { 200: usersSearchResponseSchema },
      },
    },
    async (req, reply) => {
      const userId = req.userAuth!.user.id;
      const excludeGroupId = req.query.excludeGroupId
        ? Number(req.query.excludeGroupId)
        : undefined;
      const result = await getSuggestedUsers({
        userId,
        excludeGroupId: Number.isNaN(excludeGroupId)
          ? undefined
          : excludeGroupId,
      });
      return reply.send(result);
    }
  );
};

export default usersSearchRoutes;
