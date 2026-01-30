import { JobTriggerBy, RunTrigger } from "@repo/db";

export type JobRunOpts = {
  dryRun?: boolean;
  /**
   * Whether this run was triggered automatically (cron) or manually.
   * If omitted, jobs will infer it from `triggeredBy` when possible.
   */
  trigger?: RunTrigger;
  triggeredBy?: JobTriggerBy | null;
  triggeredById?: string | null;
  meta?: Record<string, unknown>;
  signal?: AbortSignal;
  idempotencyKey?: string;
};

export type JobRunResult<T = unknown> = {
  jobRunId: number;
  meta: T;
};

/**
 * StandardJobRunStats
 * -------------------
 * A common return shape used by most jobs after execution.
 *
 * Why this exists:
 * - Many jobs return the same “run summary” fields.
 * - We keep it in `types/jobs.ts` so job files stay consistent and don't repeat inline types.
 *
 * Fields:
 * - jobRunId: DB id of the `job_runs` row created for this execution.
 * - fetched: number of items pulled from the provider (before filtering/DB writes).
 * - total/ok/fail: optional counters returned by seeders/batches (job-specific meaning).
 * - batchId: optional seed batch id (if the job uses seed batches).
 * - skipped: whether the job skipped execution (typically because cron-triggered while disabled).
 */
export type StandardJobRunStats = {
  jobRunId: number;
  fetched: number;
  total?: number;
  ok?: number;
  fail?: number;
  batchId?: number | null;
  skipped: boolean;
};
