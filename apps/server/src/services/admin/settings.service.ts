/**
 * Admin Settings Service
 * ----------------------
 * CRUD for admin-wide settings (single row, id=1).
 * Currently handles notification preferences (Slack webhook, severity threshold)
 * and league order preferences.
 */

import { prisma, Prisma } from "@repo/db";

export interface AdminNotificationSettings {
  slackWebhookUrl: string | null;
  slackEnabled: boolean;
  slackSeverityThreshold: "critical" | "warning" | "all";
}

export interface AdminLeagueOrderSettings {
  defaultLeagueOrder: number[] | null;
}

export interface AdminTeamOrderSettings {
  defaultTeamOrder: number[] | null;
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

// ─── League Order Settings ───

/**
 * Get league order settings (creates default row if none exists).
 */
export async function getLeagueOrderSettings(): Promise<AdminLeagueOrderSettings> {
  const row = await prisma.adminSettings.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      slackWebhookUrl: process.env.SLACK_WEBHOOK_URL ?? null,
      slackEnabled: !!process.env.SLACK_WEBHOOK_URL,
      slackSeverityThreshold: "warning",
      defaultLeagueOrder: Prisma.JsonNull,
    },
    update: {},
  });

  return {
    defaultLeagueOrder: row.defaultLeagueOrder as number[] | null,
  };
}

/**
 * Update league order settings with validation.
 * @param leagueIds - Array of league IDs in display order
 */
export async function updateLeagueOrderSettings(
  leagueIds: number[]
): Promise<AdminLeagueOrderSettings> {
  // Validate that all provided league IDs exist
  if (leagueIds.length > 0) {
    const existingLeagues = await prisma.leagues.findMany({
      where: { id: { in: leagueIds } },
      select: { id: true },
    });
    const existingIds = new Set(existingLeagues.map((l) => l.id));
    const invalidIds = leagueIds.filter((id) => !existingIds.has(id));
    if (invalidIds.length > 0) {
      throw new Error(`Invalid league IDs: ${invalidIds.join(", ")}`);
    }
  }

  // Ensure row exists
  await prisma.adminSettings.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      slackWebhookUrl: process.env.SLACK_WEBHOOK_URL ?? null,
      slackEnabled: !!process.env.SLACK_WEBHOOK_URL,
      slackSeverityThreshold: "warning",
      defaultLeagueOrder: leagueIds.length > 0 ? leagueIds : Prisma.JsonNull,
    },
    update: {},
  });

  const row = await prisma.adminSettings.update({
    where: { id: SETTINGS_ID },
    data: {
      defaultLeagueOrder: leagueIds.length > 0 ? leagueIds : Prisma.JsonNull,
    },
  });

  return {
    defaultLeagueOrder: row.defaultLeagueOrder as number[] | null,
  };
}

// ─── Team Order Settings ───

/**
 * Get team order settings (creates default row if none exists).
 */
export async function getTeamOrderSettings(): Promise<AdminTeamOrderSettings> {
  const row = await prisma.adminSettings.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      slackWebhookUrl: process.env.SLACK_WEBHOOK_URL ?? null,
      slackEnabled: !!process.env.SLACK_WEBHOOK_URL,
      slackSeverityThreshold: "warning",
      defaultTeamOrder: Prisma.JsonNull,
    },
    update: {},
  });

  return {
    defaultTeamOrder: row.defaultTeamOrder as number[] | null,
  };
}

/**
 * Update team order settings with validation.
 * @param teamIds - Array of team IDs in display order
 */
export async function updateTeamOrderSettings(
  teamIds: number[]
): Promise<AdminTeamOrderSettings> {
  // Validate that all provided team IDs exist
  if (teamIds.length > 0) {
    const existingTeams = await prisma.teams.findMany({
      where: { id: { in: teamIds } },
      select: { id: true },
    });
    const existingIds = new Set(existingTeams.map((t) => t.id));
    const invalidIds = teamIds.filter((id) => !existingIds.has(id));
    if (invalidIds.length > 0) {
      throw new Error(`Invalid team IDs: ${invalidIds.join(", ")}`);
    }
  }

  // Ensure row exists
  await prisma.adminSettings.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      slackWebhookUrl: process.env.SLACK_WEBHOOK_URL ?? null,
      slackEnabled: !!process.env.SLACK_WEBHOOK_URL,
      slackSeverityThreshold: "warning",
      defaultTeamOrder: teamIds.length > 0 ? teamIds : Prisma.JsonNull,
    },
    update: {},
  });

  const row = await prisma.adminSettings.update({
    where: { id: SETTINGS_ID },
    data: {
      defaultTeamOrder: teamIds.length > 0 ? teamIds : Prisma.JsonNull,
    },
  });

  return {
    defaultTeamOrder: row.defaultTeamOrder as number[] | null,
  };
}
