// src/routes/admin/dashboard/dashboard.route.ts
// Dashboard: operational metrics. Mounted under /admin/dashboard by Fastify autoload.

import { FastifyPluginAsync } from "fastify";
import { getDashboardData } from "../../../services/admin/dashboard.service";

const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /admin/dashboard - Operational dashboard data
  fastify.get("/", async (_req, reply) => {
    const data = await getDashboardData();
    return reply.send(data);
  });
};

export default dashboardRoutes;
