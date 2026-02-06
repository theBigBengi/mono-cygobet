import type { FastifyPluginAsync } from "fastify";
import * as chatService from "../../services/api/groups/service/chat";
import { prisma } from "@repo/db";

const chatRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.userAuth.requireOnboardingComplete);

  // GET /api/groups/unread-counts — must be defined before /groups/:id to avoid :id capturing "unread-counts"
  fastify.get("/groups/unread-counts", async (req) => {
    const userId = req.userAuth!.user.id;

    const memberships = await prisma.groupMembers.findMany({
      where: { userId, status: "joined" },
      select: { groupId: true },
    });

    const counts = await chatService.getUnreadCounts(
      userId,
      memberships.map((m) => m.groupId)
    );
    return { data: counts };
  });

  // GET /api/groups/chat/preview — must be before /groups/:id
  fastify.get("/groups/chat/preview", async (req) => {
    const userId = req.userAuth!.user.id;

    const memberships = await prisma.groupMembers.findMany({
      where: { userId, status: "joined" },
      select: { groupId: true },
    });

    const groupIds = memberships.map((m) => m.groupId);
    const preview = await chatService.getGroupsChatPreview(userId, groupIds);

    return { status: "success", data: preview };
  });

  // GET /api/groups/:id/messages?before=<cursor>&limit=30
  fastify.get<{
    Params: { id: string };
    Querystring: { before?: string; limit?: string };
  }>("/groups/:id/messages", async (req) => {
    const groupId = parseInt(req.params.id, 10);
    const userId = req.userAuth!.user.id;
    const before = req.query.before
      ? parseInt(req.query.before, 10)
      : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;

    const messages = await chatService.getMessages(groupId, userId, {
      before,
      limit,
    });
    return { data: messages };
  });

  // POST /api/groups/:id/messages (REST fallback)
  fastify.post<{
    Params: { id: string };
    Body: {
      body: string;
      mentions?: Array<{
        type: "user" | "fixture";
        id: number;
        display: string;
      }>;
    };
  }>("/groups/:id/messages", async (req) => {
    const groupId = parseInt(req.params.id, 10);
    const userId = req.userAuth!.user.id;
    const user = req.userAuth!.user;

    const message = await chatService.sendMessage(
      groupId,
      userId,
      req.body.body,
      req.body.mentions
    );

    // Broadcast via Socket.IO too
    fastify.io?.to(`group:${groupId}`).emit("message:new", {
      id: message.id,
      createdAt: message.createdAt.toISOString(),
      groupId: message.groupId,
      senderId: message.senderId,
      type: message.type,
      body: message.body,
      meta: message.meta as Record<string, unknown> | null,
      sender: {
        id: user.id,
        username: user.username,
        image: user.image,
      },
    });

    return { data: message };
  });

  // POST /api/groups/:id/messages/read
  fastify.post<{
    Params: { id: string };
    Body: { lastReadMessageId: number };
  }>("/groups/:id/messages/read", async (req) => {
    const groupId = parseInt(req.params.id, 10);
    const userId = req.userAuth!.user.id;
    await chatService.markAsRead(groupId, userId, req.body.lastReadMessageId);
    return { status: "ok" };
  });
};

export default chatRoutes;
