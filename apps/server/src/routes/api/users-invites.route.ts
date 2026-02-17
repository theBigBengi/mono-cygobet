// src/routes/api/users-invites.route.ts
// GET /api/users/invites, POST /api/users/invites/:inviteId/respond

import type { FastifyPluginAsync } from "fastify";
import {
  getMyInvites,
  respondToInvite,
} from "../../services/api/invites/service";
import type {
  ApiUserInvitesResponse,
  ApiRespondToInviteBody,
  ApiRespondToInviteResponse,
  ApiGroupResponse,
} from "@repo/types";
import {
  userInvitesQuerystringSchema,
  userInvitesResponseSchema,
  respondToInviteBodySchema,
  respondToInviteResponseSchema,
} from "../../schemas/api";

const usersInvitesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.userAuth.requireOnboardingComplete);

  // GET /api/users/invites — list my invites (static route first)
  fastify.get<{
    Querystring: { status?: string };
    Reply: ApiUserInvitesResponse;
  }>(
    "/users/invites",
    {
      schema: {
        querystring: userInvitesQuerystringSchema,
        response: { 200: userInvitesResponseSchema },
      },
    },
    async (req, reply) => {
      const userId = req.userAuth!.user.id;
      const status = req.query.status as
        | "pending"
        | "accepted"
        | "declined"
        | "expired"
        | "cancelled"
        | undefined;
      const result = await getMyInvites(userId, status);
      return reply.send(result);
    }
  );

  // POST /api/users/invites/:inviteId/respond
  fastify.post<{
    Params: { inviteId: string };
    Body: ApiRespondToInviteBody;
    Reply: ApiGroupResponse | { status: "success" };
  }>(
    "/users/invites/:inviteId/respond",
    {
      schema: {
        params: {
          type: "object",
          required: ["inviteId"],
          properties: { inviteId: { type: "string" } },
        },
        body: respondToInviteBodySchema,
        response: { 200: respondToInviteResponseSchema },
      },
    },
    async (req, reply) => {
      const inviteId = Number(req.params.inviteId);
      if (Number.isNaN(inviteId)) {
        return reply.status(400).send({
          status: "error",
          message: "Invalid invite ID",
        } as any);
      }
      const userId = req.userAuth!.user.id;
      const { action } = req.body;
      const result = await respondToInvite(
        inviteId,
        userId,
        action,
        fastify.io
      );
      if (result.data) {
        return reply.send({
          status: "success",
          data: result.data,
          message: "Invite accepted",
        } as ApiGroupResponse);
      }
      return reply.send({
        status: "success",
        message: "Invite declined",
      } as any);
    }
  );
};

export default usersInvitesRoutes;
