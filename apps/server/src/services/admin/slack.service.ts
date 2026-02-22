/**
 * Slack Webhook Service
 * ---------------------
 * Sends admin alert notifications to Slack via Incoming Webhook.
 *
 * Configuration:
 * - Primary: DB-stored settings (adminSettings table)
 * - Fallback: Env var SLACK_WEBHOOK_URL
 * - Severity threshold is configurable via admin settings UI
 * - Tracks slackSentAt to prevent duplicate notifications
 */

import type { AdminAlertItem } from "@repo/types";
import { markSlackSent } from "./alerts.service";
import {
  getEffectiveSlackWebhookUrl,
  shouldNotifySlack,
} from "./settings.service";
import { getLogger } from "../../logger";

const log = getLogger("SlackService");

const SEVERITY_EMOJI: Record<string, string> = {
  critical: ":red_circle:",
  warning: ":large_orange_circle:",
  info: ":large_blue_circle:",
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#dc2626",
  warning: "#f59e0b",
  info: "#3b82f6",
};

const CATEGORY_LABEL: Record<string, string> = {
  job_failure: "Job Failure",
  fixture_stuck: "Stuck Fixture",
  fixture_unsettled: "Unsettled",
  data_quality: "Data Quality",
  overdue_ns: "Overdue NS",
};

/**
 * Send an alert notification to Slack.
 * Returns true if sent successfully, false otherwise.
 */
export async function sendAlertToSlack(alert: AdminAlertItem): Promise<boolean> {
  // Don't send if already notified
  if (alert.slackSentAt) return false;

  // Check severity threshold from DB settings
  const shouldSend = await shouldNotifySlack(alert.severity);
  if (!shouldSend) return false;

  const webhookUrl = await getEffectiveSlackWebhookUrl();
  if (!webhookUrl) {
    log.debug("No Slack webhook URL configured, skipping notification");
    return false;
  }

  const emoji = SEVERITY_EMOJI[alert.severity] ?? ":grey_question:";
  const color = SEVERITY_COLOR[alert.severity] ?? "#6b7280";
  const categoryLabel = CATEGORY_LABEL[alert.category] ?? alert.category;
  const timestamp = Math.floor(new Date(alert.createdAt).getTime() / 1000);

  const adminBaseUrl = process.env.ADMIN_APP_URL ?? "http://localhost:5173";
  const actionUrl = alert.actionUrl ? `${adminBaseUrl}${alert.actionUrl}` : undefined;

  const blocks: unknown[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${emoji} *${alert.title}*\n${alert.description}`,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `*${categoryLabel}* · ${alert.severity.toUpperCase()} · <!date^${timestamp}^{date_short_pretty} at {time}|${alert.createdAt}>`,
        },
      ],
    },
  ];

  if (actionUrl && alert.actionLabel) {
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: alert.actionLabel },
          url: actionUrl,
        },
      ],
    });
  }

  const payload = {
    attachments: [
      {
        color,
        blocks,
        fallback: `[${alert.severity.toUpperCase()}] [${categoryLabel}] ${alert.title}: ${alert.description}`,
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      log.warn({ status: res.status, alertId: alert.id }, "Slack webhook returned non-OK status");
      return false;
    }

    await markSlackSent(alert.id);
    log.info({ alertId: alert.id, severity: alert.severity }, "Slack notification sent");
    return true;
  } catch (err) {
    log.error({ err, alertId: alert.id }, "Failed to send Slack notification");
    return false;
  }
}
