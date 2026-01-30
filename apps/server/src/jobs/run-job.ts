import { JobTriggerBy, RunTrigger } from "@repo/db";
import type { JobRunOpts } from "../types/jobs";
import {
  finishJobRunFailed,
  finishJobRunSkipped,
  finishJobRunSuccess,
  getJobRowOrThrow,
  startJobRun,
} from "./jobs.db";
import { getLogger } from "../logger";

export type RunJobContext = {
  jobRunId: number;
  startedAtMs: number;
  log: ReturnType<typeof getLogger>;
};

export type RunJobParams<TResult> = {
  jobKey: string;
  loggerName: string;
  opts: JobRunOpts;
  meta?: Record<string, unknown>;
  run: (ctx: RunJobContext) => Promise<{
    result: TResult;
    rowsAffected: number;
    meta: Record<string, unknown>;
  }>;
  /** Return value when skipped (disabled + cron). Can be a function to receive jobRunId. */
  skippedResult: TResult | ((jobRunId: number) => TResult);
  /** Pre-fetched job row (avoids duplicate DB read when caller already loaded it). */
  jobRow?: Awaited<ReturnType<typeof getJobRowOrThrow>>;
};

export async function runJob<TResult>({
  jobKey,
  loggerName,
  opts,
  meta: extraMeta,
  run,
  skippedResult,
  jobRow: preFetchedJobRow,
}: RunJobParams<TResult>): Promise<TResult> {
  const log = getLogger(loggerName);
  const jobRow = preFetchedJobRow ?? (await getJobRowOrThrow(jobKey));

  const trigger =
    opts.trigger ??
    (opts.triggeredBy === JobTriggerBy.cron_scheduler
      ? RunTrigger.auto
      : RunTrigger.manual);

  const jobRun = await startJobRun({
    jobKey,
    trigger,
    triggeredBy: opts.triggeredBy ?? null,
    triggeredById: opts.triggeredById ?? null,
    meta: { dryRun: !!opts.dryRun, ...extraMeta, ...(opts.meta ?? {}) },
  });
  const startedAtMs = jobRun.startedAtMs;

  log.info(
    { jobRunId: jobRun.id, ...extraMeta, dryRun: !!opts.dryRun },
    "job started"
  );

  const isCronTrigger = opts.triggeredBy === JobTriggerBy.cron_scheduler;
  if (!jobRow.enabled && isCronTrigger) {
    await finishJobRunSkipped({
      id: jobRun.id,
      startedAtMs,
      rowsAffected: 0,
      meta: { reason: "disabled", ...extraMeta },
    });
    return typeof skippedResult === "function"
      ? (skippedResult as (jobRunId: number) => TResult)(jobRun.id)
      : skippedResult;
  }

  try {
    const outcome = await run({
      jobRunId: jobRun.id,
      startedAtMs,
      log,
    });

    await finishJobRunSuccess({
      id: jobRun.id,
      startedAtMs,
      rowsAffected: outcome.rowsAffected,
      meta: outcome.meta,
    });

    return outcome.result;
  } catch (err: unknown) {
    await finishJobRunFailed({
      id: jobRun.id,
      startedAtMs,
      err,
      rowsAffected: 0,
      meta: { jobKey, ...extraMeta },
    });
    throw err;
  }
}
