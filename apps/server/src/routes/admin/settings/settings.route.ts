// src/routes/admin/settings/settings.route.ts
// Admin settings routes. Mounted under /admin/settings by Fastify autoload.

import { FastifyPluginAsync } from "fastify";
import {
  getNotificationSettings,
  updateNotificationSettings,
  getLeagueOrderSettings,
  updateLeagueOrderSettings,
  getTeamOrderSettings,
  updateTeamOrderSettings,
} from "../../../services/admin/settings.service";
import { auditFromRequest, computeChanges } from "../../../services/admin/audit-log.service";

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

    const before = await getNotificationSettings();
    const data = await updateNotificationSettings(body);
    const changes = computeChanges(before as any, data as any);

    auditFromRequest(req, reply, {
      action: "settings.update",
      category: "settings",
      description: "Updated notification settings",
      targetType: "settings",
      targetId: "notifications",
      changes,
    });

    return reply.send({
      status: "success",
      data,
      message: "Notification settings updated",
    });
  });

  // GET /admin/settings/league-order — get default league order
  fastify.get("/league-order", async (_req, reply) => {
    const data = await getLeagueOrderSettings();
    return reply.send({ status: "success", data, message: "OK" });
  });

  // PUT /admin/settings/league-order — update default league order
  fastify.put("/league-order", async (req, reply) => {
    const body = req.body as { leagueIds?: number[] };

    // Validate that leagueIds is an array of numbers
    if (body.leagueIds !== undefined) {
      if (!Array.isArray(body.leagueIds)) {
        return reply.status(400).send({
          status: "error",
          data: null,
          message: "leagueIds must be an array of numbers",
        });
      }
      if (!body.leagueIds.every((id) => typeof id === "number" && Number.isInteger(id) && id > 0)) {
        return reply.status(400).send({
          status: "error",
          data: null,
          message: "leagueIds must contain only positive integers",
        });
      }
    }

    try {
      const before = await getLeagueOrderSettings();
      const data = await updateLeagueOrderSettings(body.leagueIds ?? []);
      const changes = computeChanges(before as any, data as any);

      auditFromRequest(req, reply, {
        action: "settings.update",
        category: "settings",
        description: "Updated league order",
        targetType: "settings",
        targetId: "league-order",
        changes,
      });

      return reply.send({
        status: "success",
        data,
        message: "League order updated",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update league order";
      return reply.status(400).send({
        status: "error",
        data: null,
        message,
      });
    }
  });

  // GET /admin/settings/team-order — get default team order
  fastify.get("/team-order", async (_req, reply) => {
    const data = await getTeamOrderSettings();
    return reply.send({ status: "success", data, message: "OK" });
  });

  // PUT /admin/settings/team-order — update default team order
  fastify.put("/team-order", async (req, reply) => {
    const body = req.body as { teamIds?: number[] };

    // Validate that teamIds is an array of numbers
    if (body.teamIds !== undefined) {
      if (!Array.isArray(body.teamIds)) {
        return reply.status(400).send({
          status: "error",
          data: null,
          message: "teamIds must be an array of numbers",
        });
      }
      if (!body.teamIds.every((id) => typeof id === "number" && Number.isInteger(id) && id > 0)) {
        return reply.status(400).send({
          status: "error",
          data: null,
          message: "teamIds must contain only positive integers",
        });
      }
    }

    try {
      const before = await getTeamOrderSettings();
      const data = await updateTeamOrderSettings(body.teamIds ?? []);
      const changes = computeChanges(before as any, data as any);

      auditFromRequest(req, reply, {
        action: "settings.update",
        category: "settings",
        description: "Updated team order",
        targetType: "settings",
        targetId: "team-order",
        changes,
      });

      return reply.send({
        status: "success",
        data,
        message: "Team order updated",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update team order";
      return reply.status(400).send({
        status: "error",
        data: null,
        message,
      });
    }
  });
};

export default settingsRoutes;
