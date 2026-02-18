/**
 * Admin Settings Service
 * ----------------------
 * CRUD for admin-wide settings (single row, id=1).
 * Currently handles notification preferences (Slack webhook, severity threshold).
 */

import { prisma } from "@repo/db";

export interface AdminNotificationSettings {
  slackWebhookUrl: string | null;
  slackEnabled: boolean;
  slackSeverityThreshold: "critical" | "warning" | "all";
}

const SETTINGS_ID = 1;

/**
 * Get notification settings (creates default row if none exists).
 */
export async function getNotificationSettings(): Promise<AdminNotificationSettings> {
  const row = await prisma.adminSettings.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      slackWebhookUrl: process.env.SLACK_WEBHOOK_URL ?? null,
      slackEnabled: !!process.env.SLACK_WEBHOOK_URL,
      slackSeverityThreshold: "warning",
    },
    update: {},
  });

  return {
    slackWebhookUrl: row.slackWebhookUrl,
    slackEnabled: row.slackEnabled,
    slackSeverityThreshold: row.slackSeverityThreshold as
      | "critical"
      | "warning"
      | "all",
  };
}

/**
 * Update notification settings.
 */
export async function updateNotificationSettings(
  data: Partial<AdminNotificationSettings>
): Promise<AdminNotificationSettings> {
  // Ensure row exists
  await prisma.adminSettings.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      slackWebhookUrl: process.env.SLACK_WEBHOOK_URL ?? null,
      slackEnabled: !!process.env.SLACK_WEBHOOK_URL,
      slackSeverityThreshold: "warning",
    },
    update: {},
  });

  const row = await prisma.adminSettings.update({
    where: { id: SETTINGS_ID },
    data: {
      ...(data.slackWebhookUrl !== undefined && {
        slackWebhookUrl: data.slackWebhookUrl,
      }),
      ...(data.slackEnabled !== undefined && {
        slackEnabled: data.slackEnabled,
      }),
      ...(data.slackSeverityThreshold !== undefined && {
        slackSeverityThreshold: data.slackSeverityThreshold,
      }),
    },
  });

  return {
    slackWebhookUrl: row.slackWebhookUrl,
    slackEnabled: row.slackEnabled,
    slackSeverityThreshold: row.slackSeverityThreshold as
      | "critical"
      | "warning"
      | "all",
  };
}

/**
 * Get the effective Slack webhook URL — checks DB settings first, falls back to env var.
 */
export async function getEffectiveSlackWebhookUrl(): Promise<string | null> {
  try {
    const settings = await getNotificationSettings();
    if (!settings.slackEnabled) return null;
    return settings.slackWebhookUrl ?? process.env.SLACK_WEBHOOK_URL ?? null;
  } catch {
    // Fallback to env var if DB isn't available
    return process.env.SLACK_WEBHOOK_URL ?? null;
  }
}

/**
 * Check if an alert should trigger a Slack notification based on severity threshold.
 */
export async function shouldNotifySlack(
  severity: string
): Promise<boolean> {
  try {
    const settings = await getNotificationSettings();
    if (!settings.slackEnabled) return false;
    if (!settings.slackWebhookUrl && !process.env.SLACK_WEBHOOK_URL) return false;

    switch (settings.slackSeverityThreshold) {
      case "critical":
        return severity === "critical";
      case "warning":
        return severity === "critical" || severity === "warning";
      case "all":
        return true;
      default:
        return severity === "critical" || severity === "warning";
    }
  } catch {
    // Fallback: notify for critical/warning
    return severity === "critical" || severity === "warning";
  }
}
