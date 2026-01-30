import type { FastifyInstance } from "fastify";
import { adapter } from "../utils/adapter";
import { JobTriggerBy, RunTrigger } from "@repo/db";
import { syncFixtures } from "../etl/sync/sync.fixtures";
import type { JobRunOpts, StandardJobRunStats } from "../types/jobs";
import { LIVE_FIXTURES_JOB } from "./jobs.definitions";
import {
  finishJobRunFailed,
  finishJobRunSkipped,
  finishJobRunSuccess,
  getJobRowOrThrow,
  startJobRun,
} from "./jobs.db";
import { getLogger } from "../logger";

const log = getLogger("LiveFixturesJob");

/**
 * live-fixtures job
 * ----------------
 * Goal: Keep our DB updated with fixtures that are currently in-play (LIVE/HT/etc.)
 *
 * What it does:
 * - Fetch live fixtures from sports-data provider (livescores/inplay endpoint)
 * - Upsert them into our DB using the existing fixtures seeder (Prisma upsert)
 * - Track execution in `job_runs`
 *
 * Notes:
 * - This job is gated by the `jobs` DB table (jobs.enabled).
 * - Use `dryRun` to measure impact without DB writes.
 */
export const liveFixturesJob = LIVE_FIXTURES_JOB;

/**
 * runLiveFixturesJob()
 * -------------------
 * This is the single entrypoint the scheduler/admin calls to execute the job.
 *
 * Flow (high level):
 * 1) Read job config from DB (`jobs` table).
 * 2) Create a `job_runs` record (status=running) so UI can show progress.
 * 3) If job is disabled AND this trigger is cron => mark run as skipped and return.
 * 4) Build sports-data adapter from env.
 * 5) Fetch live fixtures, seed them, and update the run record with results.
 */
export async function runLiveFixturesJob(
  fastify: FastifyInstance,
  opts: JobRunOpts = {}
): Promise<StandardJobRunStats> {
  // Jobs are seeded in DB. Missing row is a deployment/config error.
  const jobRow = await getJobRowOrThrow(liveFixturesJob.key);

  // Disabled should only prevent cron runs. Manual "Run" should still work.
  const isCronTrigger = opts.triggeredBy === JobTriggerBy.cron_scheduler;

  const trigger =
    opts.trigger ??
    (opts.triggeredBy === JobTriggerBy.cron_scheduler
      ? RunTrigger.auto
      : RunTrigger.manual);

  const jobRun = await startJobRun({
    jobKey: liveFixturesJob.key,
    trigger,
    triggeredBy: opts.triggeredBy ?? null,
    triggeredById: opts.triggeredById ?? null,
    meta: { dryRun: !!opts.dryRun, ...(opts.meta ?? {}) },
  });
  const startedAtMs = jobRun.startedAtMs;

  if (!jobRow.enabled && isCronTrigger) {
    await finishJobRunSkipped({
      id: jobRun.id,
      startedAtMs,
      rowsAffected: 0,
      meta: {
        dryRun: !!opts.dryRun,
        reason: "disabled",
      },
    });
    return {
      jobRunId: jobRun.id,
      fetched: 0,
      total: 0,
      ok: 0,
      fail: 0,
      batchId: null,
      skipped: true,
    };
  }

  // If env is missing, skip safely (adapter creation would have failed at boot).
  const token = process.env.SPORTMONKS_API_TOKEN;
  const footballBaseUrl = process.env.SPORTMONKS_FOOTBALL_BASE_URL;
  const coreBaseUrl = process.env.SPORTMONKS_CORE_BASE_URL;

  if (!token || !footballBaseUrl || !coreBaseUrl) {
    log.warn("missing SPORTMONKS env vars; skipping job");
    await finishJobRunSkipped({
      id: jobRun.id,
      startedAtMs,
      rowsAffected: 0,
      meta: {
        dryRun: !!opts.dryRun,
        reason: "missing-env",
        ...(opts.meta ?? {}),
      },
    });
    return {
      jobRunId: jobRun.id,
      fetched: 0,
      total: 0,
      ok: 0,
      fail: 0,
      batchId: null,
      skipped: true,
    };
  }

  try {
    const fixtures = await adapter.fetchLiveFixtures({
      includeScores: true,
    });

    if (opts.dryRun) {
      await finishJobRunSuccess({
        id: jobRun.id,
        startedAtMs,
        rowsAffected: 0,
        meta: {
          dryRun: true,
          fetched: fixtures.length,
          ...(opts.meta ?? {}),
        },
      });
      return {
        jobRunId: jobRun.id,
        fetched: fixtures.length,
        total: 0,
        ok: 0,
        fail: 0,
        batchId: null,
        skipped: false,
      };
    }

    const result = await syncFixtures(fixtures, { dryRun: false });

    const ok = result.inserted + result.updated;
    await finishJobRunSuccess({
      id: jobRun.id,
      startedAtMs,
      rowsAffected: result.total,
      meta: {
        fetched: fixtures.length,
        ok,
        fail: result.failed,
        total: result.total,
        inserted: result.inserted,
        updated: result.updated,
        skipped: result.skipped,
        ...(opts.meta ?? {}),
      },
    });

    return {
      jobRunId: jobRun.id,
      fetched: fixtures.length,
      batchId: null,
      total: result.total,
      ok,
      fail: result.failed,
      skipped: false,
    };
  } catch (err: unknown) {
    await finishJobRunFailed({
      id: jobRun.id,
      startedAtMs,
      err,
      rowsAffected: 0,
      meta: {
        dryRun: !!opts.dryRun,
        ...(opts.meta ?? {}),
      },
    });
    throw err;
  }
}
