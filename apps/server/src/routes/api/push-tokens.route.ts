import { FastifyPluginAsync } from "fastify";
import {
  registerPushToken,
  removePushToken,
} from "../../services/push/push.service";

type RegisterBody = {
  token: string;
  platform: string;
};

type RemoveBody = {
  token: string;
};

const pushTokenRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: RegisterBody }>(
    "/push-tokens",
    {
      schema: {
        body: {
          type: "object",
          required: ["token", "platform"],
          properties: {
            token: { type: "string" },
            platform: { type: "string", enum: ["ios", "android"] },
          },
        },
        response: {
          200: {
            type: "object",
            properties: { success: { type: "boolean" } },
          },
        },
      },
      preHandler: [fastify.userAuth.requireAuth],
    },
    async (req, reply) => {
      const ctx = req.userAuth;
      if (!ctx) throw new Error("User auth context missing");
      await registerPushToken(ctx.user.id, req.body.token, req.body.platform);
      return reply.send({ success: true });
    }
  );

  fastify.delete<{ Body: RemoveBody }>(
    "/push-tokens",
    {
      schema: {
        body: {
          type: "object",
          required: ["token"],
          properties: {
            token: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: { success: { type: "boolean" } },
          },
        },
      },
      preHandler: [fastify.userAuth.requireAuth],
    },
    async (req, reply) => {
      await removePushToken(req.body.token);
      return reply.send({ success: true });
    }
  );
};

export default pushTokenRoutes;
