// src/routes/api/groups-members.route.ts
// Routes for group membership: members list, join public group, invite codes, nudge.

import type { FastifyPluginAsync } from "fastify";
import {
  getGroupMembers,
  joinPublicGroup,
  generateInviteCode,
  getInviteCode,
  sendNudge,
} from "../../services/api/groups";
import type {
  ApiGroupResponse,
  ApiInviteCodeResponse,
  ApiNudgeBody,
} from "@repo/types";
import {
  getGroupParamsSchema,
  groupResponseSchema,
  groupMembersResponseSchema,
  nudgeBodySchema,
  nudgeResponseSchema,
} from "../../schemas/api";

const inviteCodeResponseSchema = {
  type: "object",
  required: ["status", "data", "message"],
  properties: {
    status: { type: "string", enum: ["success"] },
    data: {
      type: "object",
      required: ["inviteCode"],
      properties: { inviteCode: { type: "string" } },
    },
    message: { type: "string" },
  },
} as const;

const membersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.userAuth.requireOnboardingComplete);

  // GET /api/groups/:id/members
  fastify.get<{ Params: { id: number } }>(
    "/groups/:id/members",
    {
      schema: {
        params: getGroupParamsSchema,
        response: { 200: groupMembersResponseSchema },
      },
    },
    async (req, reply) => {
      const id = Number(req.params.id);
      const userId = req.userAuth!.user.id;
      const result = await getGroupMembers(id, userId);
      return reply.send(result);
    }
  );

  // POST /api/groups/:id/join — join a public group by ID
  fastify.post<{
    Params: { id: number };
    Reply: ApiGroupResponse;
  }>(
    "/groups/:id/join",
    {
      schema: {
        params: getGroupParamsSchema,
        response: { 200: groupResponseSchema },
      },
    },
    async (req, reply) => {
      const id = Number(req.params.id);
      const userId = req.userAuth!.user.id;
      const result = await joinPublicGroup(id, userId, fastify.io);
      return reply.send(result);
    }
  );

  // GET /api/groups/:id/invite-code
  fastify.get<{
    Params: { id: number };
    Reply: ApiInviteCodeResponse;
  }>(
    "/groups/:id/invite-code",
    {
      schema: {
        params: getGroupParamsSchema,
        response: { 200: inviteCodeResponseSchema },
      },
    },
    async (req, reply) => {
      const id = Number(req.params.id);
      const userId = req.userAuth!.user.id;
      const result = await getInviteCode(id, userId);
      return reply.send(result);
    }
  );

  // POST /api/groups/:id/invite-code — generate or regenerate invite code
  fastify.post<{
    Params: { id: number };
    Reply: ApiInviteCodeResponse;
  }>(
    "/groups/:id/invite-code",
    {
      schema: {
        params: getGroupParamsSchema,
        response: { 200: inviteCodeResponseSchema },
      },
    },
    async (req, reply) => {
      const id = Number(req.params.id);
      const userId = req.userAuth!.user.id;
      const result = await generateInviteCode(id, userId);
      return reply.send(result);
    }
  );

  // POST /api/groups/:id/nudge — send a prediction reminder to a member
  fastify.post<{ Params: { id: number }; Body: ApiNudgeBody }>(
    "/groups/:id/nudge",
    {
      schema: {
        params: getGroupParamsSchema,
        body: nudgeBodySchema,
        response: { 201: nudgeResponseSchema },
      },
    },
    async (req, reply) => {
      const id = Number(req.params.id);
      const userId = req.userAuth!.user.id;
      const body = req.body as ApiNudgeBody;

      try {
        const result = await sendNudge(
          id,
          userId,
          body.targetUserId,
          body.fixtureId
        );
        return reply.status(201).send(result);
      } catch (err: any) {
        if (err.status === 409) {
          return reply.status(409).send({
            status: "error",
            message: err.message || "Already nudged",
          } as any);
        }
        throw err;
      }
    }
  );
};

export default membersRoutes;
