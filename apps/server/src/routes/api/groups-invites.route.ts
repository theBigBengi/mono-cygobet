// src/routes/api/groups-invites.route.ts
// POST /api/groups/:id/invites, DELETE /api/groups/:id/invites/:inviteId

import type { FastifyPluginAsync } from "fastify";
import { sendInvite, cancelInvite, getSentInvites, type SentInviteItem } from "../../services/api/invites/service";
import type { ApiSendInviteBody, ApiSendInviteResponse } from "@repo/types";
import { getGroupParamsSchema } from "../../schemas/api";
import {
  sendInviteBodySchema,
  sendInviteResponseSchema,
} from "../../schemas/api/invites.schemas";

const groupsInvitesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.userAuth.requireOnboardingComplete);

  // POST /api/groups/:id/invites
  fastify.post<{
    Params: { id: number };
    Body: ApiSendInviteBody;
    Reply: ApiSendInviteResponse;
  }>(
    "/groups/:id/invites",
    {
      config: {
        rateLimit: { max: 10, timeWindow: "1 minute" },
      },
      schema: {
        params: getGroupParamsSchema,
        body: sendInviteBodySchema,
        response: { 200: sendInviteResponseSchema },
      },
    },
    async (req, reply) => {
      const groupId = Number(req.params.id);
      const userId = req.userAuth!.user.id;
      const { userId: inviteeId, message } = req.body;
      const result = await sendInvite(
        groupId,
        userId,
        inviteeId,
        message,
        fastify.io
      );
      return reply.send(result);
    }
  );

  // GET /api/groups/:id/invites/sent - get invites sent by current user
  fastify.get<{
    Params: { id: string };
    Reply: { status: "success"; data: SentInviteItem[] };
  }>(
    "/groups/:id/invites/sent",
    {
      schema: {
        params: getGroupParamsSchema,
        response: {
          200: {
            type: "object",
            required: ["status", "data"],
            properties: {
              status: { type: "string", enum: ["success"] },
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "number" },
                    inviteeId: { type: "number" },
                    inviteeUsername: { type: ["string", "null"] },
                    inviteeImage: { type: ["string", "null"] },
                    message: { type: ["string", "null"] },
                    createdAt: { type: "string" },
                    expiresAt: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const groupId = Number(req.params.id);
      const userId = req.userAuth!.user.id;
      const result = await getSentInvites(groupId, userId);
      return reply.send(result);
    }
  );

  // DELETE /api/groups/:id/invites/:inviteId
  fastify.delete<{ Params: { id: string; inviteId: string } }>(
    "/groups/:id/invites/:inviteId",
    {
      schema: {
        params: {
          type: "object",
          required: ["id", "inviteId"],
          properties: {
            id: { type: "number", minimum: 1 },
            inviteId: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            required: ["status"],
            properties: { status: { type: "string", enum: ["success"] } },
          },
        },
      },
    },
    async (req, reply) => {
      const groupId = Number(req.params.id);
      const inviteId = Number(req.params.inviteId);
      if (Number.isNaN(groupId) || Number.isNaN(inviteId)) {
        return reply.status(400).send({
          status: "error",
          message: "Invalid group or invite ID",
        } as any);
      }
      const userId = req.userAuth!.user.id;
      await cancelInvite(groupId, inviteId, userId, fastify.io);
      return reply.send({ status: "success" });
    }
  );
};

export default groupsInvitesRoutes;
