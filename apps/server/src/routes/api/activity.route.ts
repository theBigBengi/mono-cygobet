import type { FastifyPluginAsync } from "fastify";
import { getActivityFeed } from "../../services/api/activity/activity";

/**
 * GET /api/activity — Activity feed (cross-group system events).
 * Mounted under /api by Fastify autoload.
 */
const activityRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook(
    "preHandler",
    fastify.userAuth.requireOnboardingComplete
  );

  fastify.get<{
    Querystring: { before?: string; limit?: string };
  }>("/activity", async (req) => {
    const userId = req.userAuth!.user.id;
    const before = req.query.before;
    const limitStr = req.query.limit;
    const parsed = limitStr ? parseInt(limitStr, 10) : undefined;
    const limit = parsed && Number.isFinite(parsed) && parsed > 0
      ? Math.min(parsed, 100)
      : undefined;

    const { items, hasMore } = await getActivityFeed(userId, { before, limit });
    return {
      status: "success",
      data: { items, hasMore },
    };
  });
};

export default activityRoutes;
