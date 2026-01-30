import type { FastifyInstance } from "fastify";
import { addDays, format } from "date-fns";
import { adapter } from "../utils/adapter";
import type { FixtureDTO } from "@repo/types/sport-data/common";
import { JobTriggerBy, RunTrigger } from "@repo/db";
import { seedFixtures } from "../etl/seeds/seed.fixtures";
import { JobRunOpts, type StandardJobRunStats } from "../types/jobs";
import { UPCOMING_FIXTURES_JOB } from "./jobs.definitions";
import {
  finishJobRunFailed,
  finishJobRunSuccess,
  finishJobRunSkipped,
  getJobRowOrThrow,
  startJobRun,
} from "./jobs.db";
import { clampInt, getMeta, isUpcomingFixturesJobMeta } from "./jobs.meta";
import { getLogger } from "../logger";

const log = getLogger("UpcomingFixturesJob");

// Fixture state for finished fixtures
const FIXTURE_STATE_FT = "FT";

// Days ahead to fetch fixtures for
const DAYS_AHEAD = 3;

async function skipJob(
  jobRunId: number,
  reason: string,
  startedAtMs: number,
  opts: JobRunOpts & { daysAhead?: number }
) {
  const from = format(new Date(), "yyyy-MM-dd");
  const to = format(
    addDays(new Date(), opts.daysAhead ?? DAYS_AHEAD),
    "yyyy-MM-dd"
  );

  await finishJobRunSkipped({
    id: jobRunId,
    startedAtMs,
    rowsAffected: 0,
    meta: {
      daysAhead: opts.daysAhead ?? DAYS_AHEAD,
      dryRun: !!opts.dryRun,
      window: { from, to },
      reason,
    },
  });

  return {
    jobRunId,
    batchId: null,
    fetched: 0,
    scheduled: 0,
    total: 0,
    ok: 0,
    fail: 0,
    window: { from, to },
    skipped: true,
  };
}

/**
 * upcoming-fixtures job
 * --------------------
 * Goal: Keep our DB populated with upcoming fixtures (NS) for a forward-looking window.
 *
 * What it does:
 * - Fetch fixtures from sports-data provider between [today .. today+daysAhead]
 * - Filter to NS (Not Started)
 * - Upsert them into our DB using the existing fixtures seeder (which uses Prisma upsert)
 * - Track job execution in `job_runs` (jobRuns)
 *
 * Notes:
 * - This is intentionally "NS only" so it doesn't interfere with state progression jobs (LIVE/FT).
 * - The job is gated by the `jobs` table (jobs.enabled).
 */
export const upcomingFixturesJob = UPCOMING_FIXTURES_JOB;

const DEFAULT_DAYS_AHEAD = UPCOMING_FIXTURES_JOB.meta?.daysAhead ?? DAYS_AHEAD;

/**
 * isNotStarted()
 * --------------
 * Provider returns fixtures in many states; this job only wants NS (Not Started).
 * We keep this as a tiny helper to make the filtering logic readable/testable.
 */
function isNotStarted(fx: FixtureDTO): boolean {
  return String(fx.state) === "NS";
}

/**
 * runUpcomingFixturesJob()
 * -----------------------
 * Entry point for scheduler/admin to execute the “upcoming fixtures” job.
 *
 * Flow:
 * 1) Read job config from DB (must exist; jobs are seeded).
 * 2) Create a job_run record.
 * 3) Skip if disabled + cron trigger.
 * 4) Fetch fixtures in window, filter to NS, seed into DB.
 * 5) Persist run results to job_runs.
 */
export async function runUpcomingFixturesJob(
  fastify: FastifyInstance,
  opts: JobRunOpts & { daysAhead?: number }
): Promise<
  StandardJobRunStats & {
    scheduled: number;
    window: { from: string; to: string };
  }
> {
  // Jobs are seeded in DB. Missing row is a deployment/config error.
  const jobRow = await getJobRowOrThrow(upcomingFixturesJob.key);

  const meta = getMeta<{ daysAhead?: number }>(jobRow.meta);
  if (!isUpcomingFixturesJobMeta(meta)) {
    throw new Error("Invalid job meta for upcoming-fixtures");
  }
  const daysAhead = clampInt(
    opts.daysAhead ?? meta.daysAhead ?? DEFAULT_DAYS_AHEAD,
    1,
    30
  );

  // Disabled should only prevent cron runs. Manual "Run" should still work.
  const isCronTrigger = opts.triggeredBy === JobTriggerBy.cron_scheduler;

  // Determine the trigger type
  const trigger =
    opts.trigger ??
    (opts.triggeredBy === JobTriggerBy.cron_scheduler
      ? RunTrigger.auto
      : RunTrigger.manual);

  // Start the job run
  const jobRun = await startJobRun({
    jobKey: upcomingFixturesJob.key,
    trigger,
    triggeredBy: opts.triggeredBy ?? null,
    triggeredById: opts.triggeredById ?? null,
    meta: { daysAhead, dryRun: !!opts.dryRun, ...(opts.meta ?? {}) },
  });
  const startedAtMs = jobRun.startedAtMs;

  // Date-only format works with provider "between" endpoint and is URL-encoded in the adapter.
  const from = format(new Date(), "yyyy-MM-dd");
  const to = format(addDays(new Date(), daysAhead), "yyyy-MM-dd");

  // If the job is disabled and the trigger is a cron scheduler, skip the job
  if (!jobRow.enabled && isCronTrigger) {
    return skipJob(jobRun.id, "disabled", startedAtMs, opts);
  }

  // If env is missing, skip safely (adapter creation would have failed at boot).
  const token = process.env.SPORTMONKS_API_TOKEN;
  const footballBaseUrl = process.env.SPORTMONKS_FOOTBALL_BASE_URL;
  const coreBaseUrl = process.env.SPORTMONKS_CORE_BASE_URL;

  if (!token || !footballBaseUrl || !coreBaseUrl) {
    log.warn("missing SPORTMONKS env vars; skipping");
    return skipJob(jobRun.id, "missing-env", startedAtMs, opts);
  }

  try {
    // Ask provider for scheduled fixtures only (fixtureStates=1 == NS).
    const fetched = await adapter.fetchFixturesBetween(from, to, {
      filters: { fixtureStates: "1" },
    });

    // Defensive filter (in case provider returns extra states).
    const scheduled = fetched.filter(isNotStarted);

    if (!scheduled.length) {
      await finishJobRunSuccess({
        id: jobRun.id,
        startedAtMs,
        rowsAffected: 0,
        meta: {
          window: { from, to },
          daysAhead,
          dryRun: !!opts.dryRun,
          countFetched: fetched.length,
          countScheduled: 0,
          reason: "no-upcoming-ns",
        },
      });

      return {
        jobRunId: jobRun.id,
        batchId: null,
        fetched: fetched.length,
        scheduled: 0,
        total: 0,
        ok: 0,
        fail: 0,
        window: { from, to },
        skipped: false,
      };
    }

    // Dry run: report what we would do, but do not write to DB.
    if (opts.dryRun) {
      await finishJobRunSuccess({
        id: jobRun.id,
        startedAtMs,
        rowsAffected: 0,
        meta: {
          window: { from, to },
          daysAhead,
          dryRun: true,
          countFetched: fetched.length,
          countScheduled: scheduled.length,
        },
      });

      return {
        jobRunId: jobRun.id,
        batchId: null,
        fetched: fetched.length,
        scheduled: scheduled.length,
        total: 0,
        ok: 0,
        fail: 0,
        window: { from, to },
        skipped: false,
      };
    }

    const result = await seedFixtures(scheduled, {
      version: "v1",
      trigger,
      triggeredBy: opts.triggeredBy ?? null,
      triggeredById: opts.triggeredById ?? null,
      dryRun: false,
    });

    await finishJobRunSuccess({
      id: jobRun.id,
      startedAtMs,
      rowsAffected: result?.total ?? scheduled.length,
      meta: {
        window: { from, to },
        daysAhead,
        dryRun: false,
        countFetched: fetched.length,
        countScheduled: scheduled.length,
        batchId: result?.batchId ?? null,
        ok: result?.ok ?? 0,
        fail: result?.fail ?? 0,
        total: result?.total ?? 0,
        inserted: result?.inserted ?? 0,
        updated: result?.updated ?? 0,
        skipped: result?.skipped ?? 0,
      },
    });

    return {
      jobRunId: jobRun.id,
      batchId: result?.batchId ?? null,
      fetched: fetched.length,
      scheduled: scheduled.length,
      total: result?.total,
      ok: result?.ok,
      fail: result?.fail,
      window: { from, to },
      skipped: false,
    };
  } catch (err: unknown) {
    await finishJobRunFailed({
      id: jobRun.id,
      startedAtMs,
      err,
      rowsAffected: 0,
      meta: {
        window: { from, to },
        daysAhead,
        dryRun: !!opts.dryRun,
        jobKey: upcomingFixturesJob.key,
      },
    });
    throw err;
  }
}
