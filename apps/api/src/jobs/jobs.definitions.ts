/**
 * Central job defaults
 * --------------------
 * This file is the single source of truth for default job metadata
 * used when creating a row in the `jobs` table (first time only).
 *
 * IMPORTANT:
 * - Do NOT overwrite DB values on subsequent runs (admin can edit).
 */

export type JobDefinition = {
  key: string;
  description: string;
  enabled: boolean;
  scheduleCron: string | null;
};

export const UPCOMING_FIXTURES_JOB = {
  key: "upsert-upcoming-fixtures",
  description: "Fetch upcoming NS fixtures (next 3 days) and upsert into DB",
  enabled: true,
  // every 6 hours (minute 10) - offset from other jobs
  scheduleCron: "10 */6 * * *",
} as const satisfies JobDefinition;

export const LIVE_FIXTURES_JOB = {
  key: "upsert-live-fixtures",
  description: "Fetch live fixtures (inplay) and upsert into DB",
  enabled: true,
  // every 5 minutes
  scheduleCron: "*/5 * * * *",
} as const satisfies JobDefinition;

export const FINISHED_FIXTURES_JOB = {
  key: "finished-fixtures",
  description:
    "Update DB fixtures that should be finished (LIVE too long) to their finished state/result from provider",
  enabled: true,
  // every hour (at minute 0)
  scheduleCron: "0 * * * *",
} as const satisfies JobDefinition;

export const UPDATE_PREMATCH_ODDS_JOB = {
  key: "update-prematch-odds",
  description:
    "Fetch prematch odds for a rolling window and upsert them into DB (markets 1,57; bookmaker 1)",
  enabled: true,
  // every hour (at minute 0)
  scheduleCron: "0 * * * *",
} as const satisfies JobDefinition;

export const JOB_DEFINITIONS = [
  UPCOMING_FIXTURES_JOB,
  LIVE_FIXTURES_JOB,
  FINISHED_FIXTURES_JOB,
  UPDATE_PREMATCH_ODDS_JOB,
] as const satisfies readonly JobDefinition[];

export type JobKey = (typeof JOB_DEFINITIONS)[number]["key"];

export function getJobDefinition(jobKey: string): JobDefinition | null {
  return (
    (JOB_DEFINITIONS as readonly JobDefinition[]).find(
      (j) => j.key === jobKey
    ) ?? null
  );
}
