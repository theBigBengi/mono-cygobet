// src/routes/api/groups-activity.route.ts
// Activity feed routes: list, mark-as-read, unread counts.

import type { FastifyPluginAsync } from "fastify";
import {
  getGroupActivity,
  markActivityAsRead,
  getUnreadActivityCounts,
} from "../../services/api/groups";
import { assertGroupMember } from "../../services/api/groups/permissions";
import { getGroupParamsSchema } from "../../schemas/api";
import { prisma } from "@repo/db";

const groupsActivityRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.userAuth.requireOnboardingComplete);

  // GET /api/groups/activity/unread-counts — must be before :id to avoid capturing
  fastify.get("/groups/activity/unread-counts", async (req) => {
    const userId = req.userAuth!.user.id;

    const memberships = await prisma.groupMembers.findMany({
      where: { userId, status: "joined" },
      select: { groupId: true },
    });

    const counts = await getUnreadActivityCounts(
      userId,
      memberships.map((m) => m.groupId)
    );
    return { status: "success", data: counts };
  });

  // GET /api/groups/:id/activity
  fastify.get<{
    Params: { id: number };
    Querystring: { before?: string; limit?: string };
  }>(
    "/groups/:id/activity",
    {
      schema: {
        params: getGroupParamsSchema,
      },
    },
    async (req) => {
      const groupId = Number(req.params.id);
      const userId = req.userAuth!.user.id;

      await assertGroupMember(groupId, userId);

      const before = req.query.before;
      const limitStr = req.query.limit;
      const parsed = limitStr ? parseInt(limitStr, 10) : undefined;
      const limit =
        parsed && Number.isFinite(parsed) && parsed > 0
          ? Math.min(parsed, 50)
          : undefined;

      const { items, hasMore } = await getGroupActivity(groupId, {
        before,
        limit,
      });

      return {
        status: "success",
        data: { items, hasMore },
      };
    }
  );

  // POST /api/groups/:id/activity/read
  fastify.post<{
    Params: { id: string };
    Body: { lastReadActivityId: number };
  }>(
    "/groups/:id/activity/read",
    {
      schema: {
        params: {
          type: "object",
          properties: { id: { type: "string", pattern: "^\\d+$" } },
          required: ["id"],
        },
        body: {
          type: "object",
          properties: {
            lastReadActivityId: { type: "number", minimum: 1 },
          },
          required: ["lastReadActivityId"],
          additionalProperties: false,
        },
      },
    },
    async (req) => {
      const groupId = parseInt(req.params.id, 10);
      const userId = req.userAuth!.user.id;
      await markActivityAsRead(groupId, userId, req.body.lastReadActivityId);
      return { status: "ok" };
    }
  );
};

export default groupsActivityRoutes;
