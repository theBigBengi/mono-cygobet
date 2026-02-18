/**
 * Central job defaults
 * --------------------
 * This file is the single source of truth for default job metadata.
 *
 * What “defaults” means here:
 * - These values are used only when seeding/creating rows in the `jobs` table.
 * - After the row exists, the admin UI is allowed to change these values in DB.
 *
 * What this file is NOT:
 * - It is not the runtime scheduler; it does not decide when jobs run.
 * - It should not attempt to “sync” or overwrite DB edits on startup.
 *
 * IMPORTANT:
 * - Do NOT overwrite DB values on subsequent runs (admin can edit).
 */

import {
  UpcomingFixturesJobMeta,
  RecoveryOverdueFixturesJobMeta,
} from "@repo/types";

/**
 * JobDefinition
 * -------------
 * The default config stored in DB for each job key.
 *
 * Fields:
 * - key: stable identifier (used in URLs, DB primary key, run records)
 * - description: human readable explanation for the admin UI
 * - enabled: initial enabled state
 * - scheduleCron: initial cron schedule (5-field cron) or null for “not scheduled”
 * - meta: job-specific JSON config persisted to `jobs.meta`
 */
export type JobDefinition = {
  key: string;
  description: string;
  enabled: boolean;
  scheduleCron: string | null;
  /**
   * Per-job parameters persisted in the DB `jobs.meta` column (create-only defaults).
   * Shape is job-specific.
   */
  meta?: Record<string, unknown>;
};

/**
 * UPCOMING_FIXTURES_JOB
 * --------------------
 * Purpose: keep future fixtures available in DB ahead of time.
 */
export const UPCOMING_FIXTURES_JOB = {
  key: "upsert-upcoming-fixtures",
  description: "Fetch upcoming NS fixtures (next 3 days) and upsert into DB",
  enabled: true,
  // Every 6 hours at minute 10 (offset to avoid hammering provider at minute 0).
  scheduleCron: "10 */6 * * *",
  meta: {
    daysAhead: 3,
  } satisfies UpcomingFixturesJobMeta,
} as const satisfies JobDefinition;

/**
 * LIVE_FIXTURES_JOB
 * ----------------
 * Purpose: keep in-play fixtures (LIVE/HT/etc.) updated frequently.
 */
export const LIVE_FIXTURES_JOB = {
  key: "upsert-live-fixtures",
  description: "Fetch live fixtures (inplay) and upsert into DB",
  enabled: true,
  // Every 5 minutes.
  scheduleCron: "*/5 * * * *",
  meta: {},
} as const satisfies JobDefinition;

/**
 * FINISHED_FIXTURES_JOB
 * --------------------
 * Purpose: correct fixtures that should be finished (e.g. long-running LIVE) and persist final result.
 */
export const FINISHED_FIXTURES_JOB = {
  key: "finished-fixtures",
  description:
    "Update DB fixtures that should be finished (LIVE too long) to their finished state/result from provider",
  enabled: true,
  // Every hour at minute 0.
  scheduleCron: "0 * * * *",
  meta: {
    maxLiveAgeHours: 2,
  },
} as const satisfies JobDefinition;

/**
 * UPDATE_PREMATCH_ODDS_JOB
 * -----------------------
 * Purpose: fetch prematch odds for a rolling time window and store them in DB.
 *
 * `meta.odds.*` is the canonical configuration that the admin UI edits.
 */
export const UPDATE_PREMATCH_ODDS_JOB = {
  key: "update-prematch-odds",
  description:
    "Fetch prematch odds for a rolling window and upsert them into DB (markets 1,57; bookmaker 2)",
  enabled: true,
  // Every hour at minute 15 (offset from finished-fixtures at :00 to avoid API burst).
  scheduleCron: "15 * * * *",
  meta: {
    daysAhead: 7,
    odds: {
      bookmakerExternalIds: [2],
      marketExternalIds: [1, 57],
    },
  },
} as const satisfies JobDefinition;

/**
 * CLEANUP_EXPIRED_SESSIONS_JOB
 * ----------------------------
 * Purpose: remove expired admin sessions from the sessions table.
 * Default schedule: every hour at minute 30 (configurable via DB row).
 */
export const CLEANUP_EXPIRED_SESSIONS_JOB = {
  key: "cleanup-expired-sessions",
  description: "Delete expired admin sessions from DB",
  enabled: true,
  // Every hour at minute 30.
  scheduleCron: "30 * * * *",
  meta: {},
} as const satisfies JobDefinition;

/**
 * SYNC_GROUP_FIXTURES_JOB
 * -----------------------
 * Purpose: attach new fixtures to active groups with leagues/teams selection mode.
 * Groups get a one-time snapshot at creation; this job adds fixtures that enter the DB later.
 */
export const SYNC_GROUP_FIXTURES_JOB = {
  key: "sync-group-fixtures",
  description:
    "Attach new fixtures to active groups with leagues/teams selection mode",
  enabled: true,
  // Every hour at minute 30.
  scheduleCron: "30 * * * *",
  meta: {},
} as const satisfies JobDefinition;

/**
 * PREDICTION_REMINDERS_JOB
 * ------------------------
 * Purpose: generate user-specific reminder events for upcoming fixtures the user hasn't predicted.
 */
export const PREDICTION_REMINDERS_JOB = {
  key: "prediction-reminders",
  description:
    "Generate prediction reminder events for upcoming unpredicted fixtures",
  enabled: true,
  // Every 30 minutes.
  scheduleCron: "*/30 * * * *",
  meta: {
    reminderWindowHours: 2, // Remind when fixture starts within 2 hours
  },
} as const satisfies JobDefinition;

/**
 * RECOVERY_OVERDUE_FIXTURES_JOB
 * -----------------------------
 * Purpose: Recover fixtures stuck in NS state after their start time has passed.
 * Handles cases where server was down during match or live-fixtures job missed transitions.
 */
export const RECOVERY_OVERDUE_FIXTURES_JOB = {
  key: "recovery-overdue-fixtures",
  description:
    "Recover fixtures stuck in NS state after their start time passed",
  enabled: true,
  // Every hour at minute 45 (offset from other jobs).
  scheduleCron: "45 * * * *",
  meta: {
    graceMinutes: 30, // Don't fetch fixtures that just started
    maxOverdueHours: 48, // Don't try to recover very old fixtures
  } satisfies RecoveryOverdueFixturesJobMeta,
} as const satisfies JobDefinition;

/**
 * DATA_QUALITY_CHECK_JOB
 * ----------------------
 * Purpose: Report data quality issues for admin monitoring.
 * Counts: finished without scores, missing leagues, missing seasons.
 */
export const DATA_QUALITY_CHECK_JOB = {
  key: "data-quality-check",
  description:
    "Check data quality: finished fixtures without scores, missing leagues/seasons",
  enabled: true,
  // Run daily at 06:00 (admin can adjust in UI).
  scheduleCron: "0 6 * * *",
  meta: {},
} as const satisfies JobDefinition;

/**
 * ADMIN_ALERTS_JOB
 * ----------------
 * Purpose: Generate and auto-resolve admin alerts by scanning system state.
 * Sends Slack notifications for new critical/warning alerts.
 */
export const ADMIN_ALERTS_JOB = {
  key: "admin-alerts",
  description:
    "Generate admin alerts from system state and send Slack notifications",
  enabled: true,
  // Every 2 minutes.
  scheduleCron: "*/2 * * * *",
  meta: {},
} as const satisfies JobDefinition;

/**
 * JOB_DEFINITIONS
 * --------------
 * List of all "known jobs" and their default DB config.
 *
 * Used by:
 * - jobs seeding (`etl/seeds/seed.jobs.ts`) to guarantee rows exist in DB.
 */
export const JOB_DEFINITIONS = [
  UPCOMING_FIXTURES_JOB,
  LIVE_FIXTURES_JOB,
  FINISHED_FIXTURES_JOB,
  UPDATE_PREMATCH_ODDS_JOB,
  CLEANUP_EXPIRED_SESSIONS_JOB,
  SYNC_GROUP_FIXTURES_JOB,
  PREDICTION_REMINDERS_JOB,
  RECOVERY_OVERDUE_FIXTURES_JOB,
  DATA_QUALITY_CHECK_JOB,
  ADMIN_ALERTS_JOB,
] as const satisfies readonly JobDefinition[];

export type JobKey = (typeof JOB_DEFINITIONS)[number]["key"];

/**
 * Lookup helper for default definitions.
 * Useful for tooling / admin displays, but should not be used to override DB.
 */
export function getJobDefinition(jobKey: string): JobDefinition | null {
  return (
    (JOB_DEFINITIONS as readonly JobDefinition[]).find(
      (j) => j.key === jobKey
    ) ?? null
  );
}
