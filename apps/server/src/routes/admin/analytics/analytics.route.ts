import type { FastifyPluginAsync } from "fastify";
import {
  getAnalyticsOverview,
  getActiveUsersOverTime,
  getTopFeatures,
  getTopScreens,
  getHourlyUsage,
  getGrowth,
  getTopUsers,
  getPopularContent,
  getUserJourney,
  getEventsTimeline,
} from "../../../services/admin/analytics.service";

const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /admin/analytics/overview
  fastify.get("/overview", async (_req, reply) => {
    const data = await getAnalyticsOverview();
    return reply.send(data);
  });

  // GET /admin/analytics/active-users?days=30
  fastify.get<{ Querystring: { days?: string } }>(
    "/active-users",
    async (req, reply) => {
      const days = req.query.days ? parseInt(req.query.days, 10) : 30;
      const data = await getActiveUsersOverTime(days);
      return reply.send(data);
    }
  );

  // GET /admin/analytics/top-features?days=30
  fastify.get<{ Querystring: { days?: string } }>(
    "/top-features",
    async (req, reply) => {
      const days = req.query.days ? parseInt(req.query.days, 10) : 30;
      const data = await getTopFeatures(days);
      return reply.send(data);
    }
  );

  // GET /admin/analytics/top-screens?days=30
  fastify.get<{ Querystring: { days?: string } }>(
    "/top-screens",
    async (req, reply) => {
      const days = req.query.days ? parseInt(req.query.days, 10) : 30;
      const data = await getTopScreens(days);
      return reply.send(data);
    }
  );

  // GET /admin/analytics/hourly-usage?days=30
  fastify.get<{ Querystring: { days?: string } }>(
    "/hourly-usage",
    async (req, reply) => {
      const days = req.query.days ? parseInt(req.query.days, 10) : 30;
      const data = await getHourlyUsage(days);
      return reply.send(data);
    }
  );

  // GET /admin/analytics/growth?days=30
  fastify.get<{ Querystring: { days?: string } }>(
    "/growth",
    async (req, reply) => {
      const days = req.query.days ? parseInt(req.query.days, 10) : 30;
      const data = await getGrowth(days);
      return reply.send(data);
    }
  );

  // GET /admin/analytics/top-users?days=30
  fastify.get<{ Querystring: { days?: string } }>(
    "/top-users",
    async (req, reply) => {
      const days = req.query.days ? parseInt(req.query.days, 10) : 30;
      const data = await getTopUsers(days);
      return reply.send(data);
    }
  );

  // GET /admin/analytics/popular-content?days=30
  fastify.get<{ Querystring: { days?: string } }>(
    "/popular-content",
    async (req, reply) => {
      const days = req.query.days ? parseInt(req.query.days, 10) : 30;
      const data = await getPopularContent(days);
      return reply.send(data);
    }
  );

  // GET /admin/analytics/user-journey
  fastify.get("/user-journey", async (_req, reply) => {
    const data = await getUserJourney();
    return reply.send(data);
  });

  // GET /admin/analytics/events-timeline?days=14
  fastify.get<{ Querystring: { days?: string } }>(
    "/events-timeline",
    async (req, reply) => {
      const days = req.query.days ? parseInt(req.query.days, 10) : 14;
      const data = await getEventsTimeline(days);
      return reply.send(data);
    }
  );
};

export default analyticsRoutes;
