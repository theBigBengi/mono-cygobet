// src/routes/api/groups.route.ts
// Core CRUD routes for groups: create, list, get, update, delete, publish.

import type { FastifyPluginAsync } from "fastify";
import {
  createGroup,
  getMyGroups,
  getGroupById,
  updateGroup,
  publishGroup,
  deleteGroup,
  leaveGroup,
} from "../../services/api/groups";
import type {
  ApiCreateGroupBody,
  ApiUpdateGroupBody,
  ApiPublishGroupBody,
  ApiGroupResponse,
  ApiGroupsResponse,
} from "@repo/types";
import {
  createGroupBodySchema,
  getGroupParamsSchema,
  groupResponseSchema,
  groupsResponseSchema,
  groupFixturesFilterQuerystringSchema,
  publishGroupBodySchema,
  publishGroupResponseSchema,
} from "../../schemas/api";
import { parseGroupFixturesFilter } from "../../utils/routes";

const groupsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.userAuth.requireOnboardingComplete);

  // POST /api/groups — create a new group
  fastify.post<{ Body: ApiCreateGroupBody; Reply: ApiGroupResponse }>(
    "/groups",
    {
      schema: {
        body: createGroupBodySchema,
        response: { 200: groupResponseSchema },
      },
    },
    async (req, reply) => {
      const creatorId = req.userAuth!.user.id;
      const body = req.body;

      const result = await createGroup({
        name: body.name,
        description: body.description,
        privacy: body.privacy,
        fixtureIds: body.fixtureIds,
        selectionMode: body.selectionMode,
        teamIds: body.teamIds,
        leagueIds: body.leagueIds,
        creatorId,
      });

      return reply.send(result);
    }
  );

  // GET /api/groups — list groups for the authenticated user
  fastify.get<{ Reply: ApiGroupsResponse }>(
    "/groups",
    {
      schema: {
        response: { 200: groupsResponseSchema },
      },
    },
    async (req, reply) => {
      const userId = req.userAuth!.user.id;
      const result = await getMyGroups(userId);
      return reply.send(result);
    }
  );

  // GET /api/groups/:id — get a single group (optional ?include=fixtures with filters)
  fastify.get<{
    Params: { id: number };
    Querystring: Record<string, unknown>;
    Reply: ApiGroupResponse;
  }>(
    "/groups/:id",
    {
      schema: {
        params: getGroupParamsSchema,
        querystring: groupFixturesFilterQuerystringSchema,
        response: { 200: groupResponseSchema },
      },
    },
    async (req, reply) => {
      const id = Number(req.params.id);
      const userId = req.userAuth!.user.id;

      const includeFixtures = req.query.include === "fixtures";
      const filters = parseGroupFixturesFilter(
        req.query as Record<string, unknown>
      );
      const result = await getGroupById(id, userId, includeFixtures, filters);

      return reply.send(result);
    }
  );

  // PATCH /api/groups/:id — update group fields
  fastify.patch<{
    Params: { id: number };
    Body: ApiUpdateGroupBody;
    Reply: ApiGroupResponse;
  }>(
    "/groups/:id",
    {
      schema: {
        params: getGroupParamsSchema,
        body: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 1 },
            description: { type: "string", maxLength: 500 },
            privacy: { type: "string", enum: ["private", "public"] },
            status: { type: "string", enum: ["draft", "active", "ended"] },
            fixtureIds: { type: "array", items: { type: "number" } },
            inviteAccess: { type: "string", enum: ["all", "admin_only"] },
            nudgeEnabled: { type: "boolean" },
            nudgeWindowMinutes: { type: "number", minimum: 15, maximum: 1440 },
            onTheNosePoints: { type: "number", minimum: 0 },
            correctDifferencePoints: { type: "number", minimum: 0 },
            outcomePoints: { type: "number", minimum: 0 },
          },
        },
        response: { 200: groupResponseSchema },
      },
    },
    async (req, reply) => {
      const id = Number(req.params.id);
      const creatorId = req.userAuth!.user.id;
      const body = req.body;

      const result = await updateGroup(id, {
        name: body.name,
        description: body.description,
        privacy: body.privacy,
        fixtureIds: body.fixtureIds,
        inviteAccess: body.inviteAccess,
        nudgeEnabled: body.nudgeEnabled,
        nudgeWindowMinutes: body.nudgeWindowMinutes,
        onTheNosePoints: body.onTheNosePoints,
        correctDifferencePoints: body.correctDifferencePoints,
        outcomePoints: body.outcomePoints,
        creatorId,
      });

      return reply.send(result);
    }
  );

  // POST /api/groups/:id/leave — leave a group (members only, not creator)
  fastify.post<{
    Params: { id: number };
    Reply: { success: boolean };
  }>(
    "/groups/:id/leave",
    {
      schema: {
        params: getGroupParamsSchema,
        response: {
          200: {
            type: "object",
            required: ["success"],
            properties: { success: { type: "boolean" } },
          },
        },
      },
    },
    async (req, reply) => {
      const id = Number(req.params.id);
      const userId = req.userAuth!.user.id;
      const result = await leaveGroup(id, userId);
      return reply.send(result);
    }
  );

  // POST /api/groups/:id/publish — transition from draft to active
  fastify.post<{
    Params: { id: number };
    Body: ApiPublishGroupBody;
    Reply: ApiGroupResponse;
  }>(
    "/groups/:id/publish",
    {
      schema: {
        params: getGroupParamsSchema,
        body: publishGroupBodySchema,
        response: { 200: publishGroupResponseSchema },
      },
    },
    async (req, reply) => {
      const id = Number(req.params.id);
      const creatorId = req.userAuth!.user.id;
      const body = req.body;

      const result = await publishGroup(id, {
        name: body.name,
        description: body.description,
        privacy: body.privacy,
        onTheNosePoints: body.onTheNosePoints,
        correctDifferencePoints: body.correctDifferencePoints,
        outcomePoints: body.outcomePoints,
        predictionMode: body.predictionMode,
        koRoundMode: body.koRoundMode,
        inviteAccess: body.inviteAccess,
        maxMembers: body.maxMembers,
        creatorId,
      });

      return reply.send(result);
    }
  );

  // DELETE /api/groups/:id — delete a group
  fastify.delete<{
    Params: { id: number };
    Body?: Record<string, never>;
    Reply: { status: "success"; message: string };
  }>(
    "/groups/:id",
    {
      schema: {
        params: getGroupParamsSchema,
        body: { type: "object", additionalProperties: false },
        response: {
          200: {
            type: "object",
            required: ["status", "message"],
            properties: {
              status: { type: "string", enum: ["success"] },
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const id = Number(req.params.id);
      const creatorId = req.userAuth!.user.id;
      const result = await deleteGroup(id, creatorId);
      return reply.send(result);
    }
  );
};

export default groupsRoutes;
