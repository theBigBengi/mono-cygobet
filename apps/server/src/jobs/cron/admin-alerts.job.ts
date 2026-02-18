/**
 * admin-alerts job
 * ----------------
 * Runs every 2 minutes to:
 * 1. Generate alerts by scanning system state
 * 2. Auto-resolve alerts whose conditions no longer hold
 * 3. Send Slack notifications for new critical/warning alerts
 * 4. Emit Socket.IO events for real-time admin dashboard updates
 */

import type { FastifyInstance } from "fastify";
import { JobRunOpts } from "../../types/jobs";
import { ADMIN_ALERTS_JOB } from "../jobs.definitions";
import { getJobRowOrThrow } from "../jobs.db";
import { runJob } from "../run-job";

export const adminAlertsJob = ADMIN_ALERTS_JOB;

export async function runAdminAlertsJob(
  fastify: FastifyInstance,
  opts: JobRunOpts = {}
) {
  const jobRow = await getJobRowOrThrow(adminAlertsJob.key);

  return runJob({
    jobKey: adminAlertsJob.key,
    loggerName: "AdminAlertsJob",
    opts,
    jobRow,
    meta: {},
    skippedResult: () => ({
      newAlerts: 0,
      resolved: 0,
      slackSent: 0,
      skipped: true,
    }),
    run: async ({ log }) => {
      log.info("Generating admin alerts");

      // Dynamic imports to avoid slow startup
      const { generateAlerts, autoResolveAlerts } = await import(
        "../../services/admin/alerts.service"
      );
      const { sendAlertToSlack } = await import(
        "../../services/admin/slack.service"
      );

      // 1. Generate alerts from system state
      const newAlerts = await generateAlerts();

      // 2. Auto-resolve stale alerts
      const resolvedCount = await autoResolveAlerts();

      // 3. Send Slack notifications for new critical/warning alerts
      let slackSent = 0;
      for (const alert of newAlerts) {
        if (alert.severity === "critical" || alert.severity === "warning") {
          const sent = await sendAlertToSlack(alert);
          if (sent) slackSent++;
        }
      }

      // 4. Emit Socket.IO events for real-time updates (via /admin namespace)
      if (fastify.io && (newAlerts.length > 0 || resolvedCount > 0)) {
        const adminNs = fastify.io.of("/admin");
        for (const alert of newAlerts) {
          adminNs.to("admin").emit("alert:new", alert);
        }
        if (resolvedCount > 0) {
          adminNs.to("admin").emit("alert:resolved", { count: resolvedCount });
        }
      }

      log.info(
        { newAlerts: newAlerts.length, resolved: resolvedCount, slackSent },
        "Admin alerts job completed"
      );

      return {
        result: {
          newAlerts: newAlerts.length,
          resolved: resolvedCount,
          slackSent,
          skipped: false,
        },
        rowsAffected: newAlerts.length + resolvedCount,
        meta: {
          newAlerts: newAlerts.length,
          resolved: resolvedCount,
          slackSent,
          dryRun: !!opts.dryRun,
        },
      };
    },
  });
}
