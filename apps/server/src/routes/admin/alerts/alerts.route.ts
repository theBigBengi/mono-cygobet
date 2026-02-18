// src/routes/admin/alerts/alerts.route.ts
// Admin alerts API. Mounted under /admin/alerts by Fastify autoload.

import { FastifyPluginAsync } from "fastify";
import {
  getActiveAlerts,
  getAlertHistory,
  resolveAlert,
} from "../../../services/admin/alerts.service";

const alertsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /admin/alerts — active (unresolved) alerts
  fastify.get("/", async (_req, reply) => {
    const data = await getActiveAlerts();
    return reply.send({ status: "success", data, message: "OK" });
  });

  // GET /admin/alerts/history — resolved alerts for audit
  fastify.get("/history", async (req, reply) => {
    const { limit } = req.query as { limit?: string };
    const data = await getAlertHistory(limit ? parseInt(limit, 10) : 50);
    return reply.send({ status: "success", data, message: "OK" });
  });

  // POST /admin/alerts/:id/resolve — manually resolve an alert
  fastify.post("/:id/resolve", async (req, reply) => {
    const { id } = req.params as { id: string };
    const alertId = parseInt(id, 10);
    if (isNaN(alertId)) {
      return reply.status(400).send({ status: "error", data: null, message: "Invalid alert ID" });
    }

    const data = await resolveAlert(alertId);
    if (!data) {
      return reply.status(404).send({ status: "error", data: null, message: "Alert not found" });
    }

    return reply.send({ status: "success", data, message: "Alert resolved" });
  });
};

export default alertsRoutes;
