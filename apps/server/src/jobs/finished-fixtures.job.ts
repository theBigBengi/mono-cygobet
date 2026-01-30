import type { FastifyInstance } from "fastify";
import { adapter } from "../utils/adapter";
import { FixtureState as DbFixtureState, JobTriggerBy, RunTrigger, prisma } from "@repo/db";
import { syncFixtures } from "../etl/sync/sync.fixtures";
import { chunk } from "../etl/utils";
import { JobRunOpts } from "../types/jobs";
import { FINISHED_FIXTURES_JOB } from "./jobs.definitions";
import {
  finishJobRunFailed,
  finishJobRunSkipped,
  finishJobRunSuccess,
  getJobRowOrThrow,
  startJobRun,
} from "./jobs.db";
import { clampInt, getMeta, isFinishedFixturesJobMeta } from "./jobs.meta";
import { getLogger } from "../logger";

const log = getLogger("FinishedFixturesJob");

/**
 * finished-fixtures job
 * --------------------
 * Goal: keep our DB fixtures in sync when matches finish.
 *
 * Flow: find LIVE fixtures that are too old, re-fetch from provider (FT only),
 * then sync via syncFixtures (same transform + state validation + persist as other jobs).
 */
export const finishedFixturesJob = FINISHED_FIXTURES_JOB;

const DEFAULT_MAX_LIVE_AGE_HOURS =
  FINISHED_FIXTURES_JOB.meta?.maxLiveAgeHours ?? 2;

/**
 * Main runner called by the cron scheduler.
 * Returns lightweight stats (counts) so callers can decide whether to log.
 *
 * Flow:
 * 1) Read job config from DB.
 * 2) Create job_runs record.
 * 3) Skip if disabled + cron trigger.
 * 4) Find “too old LIVE” fixtures, re-fetch from provider, update to finished state/results.
 * 5) Update job_runs with counts/errors.
 */
export async function runFinishedFixturesJob(
  fastify: FastifyInstance,
  opts: JobRunOpts & { maxLiveAgeHours?: number } = { maxLiveAgeHours: 2 }
) {
  // Jobs are seeded in DB. Missing row is a deployment/config error.
  const jobRow = await getJobRowOrThrow(finishedFixturesJob.key);

  const meta = getMeta<{
    maxLiveAgeHours?: number;
  }>(jobRow.meta);
  if (!isFinishedFixturesJobMeta(meta)) {
    // Backward compatible: allow missing/invalid meta and fall back to default.
    // (PATCH route validation should prevent invalid writes going forward.)
  }
  const maxLiveAgeHours = clampInt(
    opts.maxLiveAgeHours ??
      (isFinishedFixturesJobMeta(meta)
        ? meta.maxLiveAgeHours
        : DEFAULT_MAX_LIVE_AGE_HOURS) ??
      DEFAULT_MAX_LIVE_AGE_HOURS,
    1,
    168
  );

  // Disabled should only prevent cron runs. Manual "Run" should still work.
  const isCronTrigger = opts.triggeredBy === JobTriggerBy.cron_scheduler;

  // Create a job run record (start)
  const trigger =
    opts.trigger ??
    (opts.triggeredBy === JobTriggerBy.cron_scheduler
      ? RunTrigger.auto
      : RunTrigger.manual);

  const jobRun = await startJobRun({
    jobKey: finishedFixturesJob.key,
    trigger,
    triggeredBy: opts.triggeredBy ?? null,
    triggeredById: opts.triggeredById ?? null,
    meta: {
      maxLiveAgeHours,
      dryRun: !!opts.dryRun,
    },
  });
  const startedAtMs = jobRun.startedAtMs;
  log.info({ jobRunId: jobRun.id, maxLiveAgeHours, dryRun: !!opts.dryRun }, "job started");

  if (!jobRow.enabled && isCronTrigger) {
    await finishJobRunSkipped({
      id: jobRun.id,
      startedAtMs,
      rowsAffected: 0,
      meta: {
        maxLiveAgeHours,
        dryRun: !!opts.dryRun,
        reason: "disabled",
      },
    });
    return { candidates: 0, fetched: 0, updated: 0, skipped: true };
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
        maxLiveAgeHours,
        dryRun: !!opts.dryRun,
        reason: "missing-env",
      },
    });
    return {
      jobRunId: jobRun.id,
      candidates: 0,
      fetched: 0,
      updated: 0,
      skipped: true,
    };
  }

  try {
    /**
     * 1) Pick LIVE fixtures that should have ended already
     * We use startTs as a proxy (LIVE older than N hours).
     */
    const cutoffTs = Math.floor(
      (Date.now() - maxLiveAgeHours * 60 * 60 * 1000) / 1000
    );

    const candidates = await prisma.fixtures.findMany({
      where: {
        state: DbFixtureState.LIVE,
        startTs: { lte: cutoffTs },
      },
      select: { externalId: true },
    });

    if (!candidates.length) {
      await finishJobRunSuccess({
        id: jobRun.id,
        startedAtMs,
        rowsAffected: 0,
        meta: {
          maxLiveAgeHours,
          dryRun: !!opts.dryRun,
          reason: "no-candidates",
        },
      });
      return {
        jobRunId: jobRun.id,
        candidates: 0,
        fetched: 0,
        updated: 0,
        skipped: false,
      };
    }

    // Provider expects numeric ids; our DB stores externalId as bigint.
    const ids = candidates
      .map((c) => Number(c.externalId))
      .filter((n) => Number.isFinite(n));

    if (!ids.length) {
      await finishJobRunSuccess({
        id: jobRun.id,
        startedAtMs,
        rowsAffected: 0,
        meta: {
          maxLiveAgeHours,
          dryRun: !!opts.dryRun,
          reason: "no-valid-external-ids",
          candidates: candidates.length,
        },
      });
      return {
        jobRunId: jobRun.id,
        candidates: candidates.length,
        fetched: 0,
        updated: 0,
        skipped: false,
      };
    }

    /**
     * 2) Ask provider for the same fixtures, but only those that are now finished (FT).
     * Provider "fixtureStates=5" == FT.
     */
    let fetched: Awaited<ReturnType<typeof adapter.fetchFixturesByIds>> = [];
    for (const group of chunk(ids, 50)) {
      if (opts.signal?.aborted) {
        log.warn("finished-fixtures fetch aborted by signal");
        break;
      }
      const part = await adapter.fetchFixturesByIds(group, {
        includeScores: true,
        filters: { fixtureStates: "5" }, // 5 = Finished (FT)
        perPage: 50,
      });
      if (part?.length) fetched = fetched.concat(part);
    }

    if (!fetched.length) {
      await finishJobRunSuccess({
        id: jobRun.id,
        startedAtMs,
        rowsAffected: 0,
        meta: {
          maxLiveAgeHours,
          dryRun: !!opts.dryRun,
          reason: "no-finished-fixtures",
          candidates: candidates.length,
        },
      });
      return {
        jobRunId: jobRun.id,
        candidates: candidates.length,
        fetched: 0,
        updated: 0,
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
          maxLiveAgeHours,
          dryRun: true,
          candidates: candidates.length,
          fetched: fetched.length,
        },
      });
      return {
        jobRunId: jobRun.id,
        candidates: candidates.length,
        fetched: fetched.length,
        updated: 0,
        skipped: false,
      };
    }

    /**
     * 3) Write updates via syncFixtures (same transform + state validation as other jobs).
     */
    const result = await syncFixtures(fetched, { dryRun: false, signal: opts.signal });
    const updated = result.updated;
    const failed = result.failed;

    await finishJobRunSuccess({
      id: jobRun.id,
      startedAtMs,
      rowsAffected: result.total,
      meta: {
        maxLiveAgeHours,
        dryRun: false,
        candidates: candidates.length,
        fetched: fetched.length,
        updated,
        failed,
        inserted: result.inserted,
        skipped: result.skipped,
      },
    });

    return {
      jobRunId: jobRun.id,
      candidates: candidates.length,
      fetched: fetched.length,
      updated,
      failed,
      skipped: false,
    };
  } catch (err: unknown) {
    await finishJobRunFailed({
      id: jobRun.id,
      startedAtMs,
      err,
      rowsAffected: 0,
      meta: {
        maxLiveAgeHours,
        dryRun: !!opts.dryRun,
        jobKey: finishedFixturesJob.key,
      },
    });
    throw err;
  }
}
