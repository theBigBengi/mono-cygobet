// src/routes/admin/settings/settings.route.ts
// Admin notification settings. Mounted under /admin/settings by Fastify autoload.

import { FastifyPluginAsync } from "fastify";
import {
  getNotificationSettings,
  updateNotificationSettings,
} from "../../../services/admin/settings.service";

const settingsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /admin/settings/notifications — current notification settings
  fastify.get("/notifications", async (_req, reply) => {
    const data = await getNotificationSettings();
    return reply.send({ status: "success", data, message: "OK" });
  });

  // PATCH /admin/settings/notifications — update notification settings
  fastify.patch("/notifications", async (req, reply) => {
    const body = req.body as {
      slackWebhookUrl?: string | null;
      slackEnabled?: boolean;
      slackSeverityThreshold?: "critical" | "warning" | "all";
    };

    // Validate severity threshold if provided
    if (
      body.slackSeverityThreshold !== undefined &&
      !["critical", "warning", "all"].includes(body.slackSeverityThreshold)
    ) {
      return reply.status(400).send({
        status: "error",
        data: null,
        message: "Invalid severity threshold. Must be 'critical', 'warning', or 'all'.",
      });
    }

    const data = await updateNotificationSettings(body);
    return reply.send({
      status: "success",
      data,
      message: "Notification settings updated",
    });
  });
};

export default settingsRoutes;
