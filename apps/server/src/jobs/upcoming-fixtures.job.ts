import type { FastifyInstance } from "fastify";
import { addDays, format } from "date-fns";
import { RunStatus } from "@repo/db";
import { adapter } from "../utils/adapter";
import { syncFixtures } from "../etl/sync/sync.fixtures";
import { finishSeedBatch } from "../etl/seeds/seed.utils";
import { JobRunOpts, type StandardJobRunStats } from "../types/jobs";
import { UPCOMING_FIXTURES_JOB } from "./jobs.definitions";
import { createBatchForJob, getJobRowOrThrow } from "./jobs.db";
import { clampInt, getMeta, isUpcomingFixturesJobMeta } from "./jobs.meta";
import { runJob } from "./run-job";

// Days ahead to fetch fixtures for
const DAYS_AHEAD = 3;

// NS(1) + cancelled states: CAN(6), INT(7), ABAN(8), SUSP(9), AWARDED(10), WO(11), POSTPONED(14)
const UPCOMING_STATE_IDS = "1,6,7,8,9,10,11,14";

/**
 * upcoming-fixtures job
 * --------------------
 * Goal: Keep our DB populated with upcoming fixtures (NS + cancelled states) for a forward-looking window.
 *
 * What it does:
 * - Fetch fixtures from sports-data provider between [today .. today+daysAhead] in states NS or cancelled (POSTPONED, etc.)
 * - Upsert them into our DB using the existing fixtures seeder (which uses Prisma upsert)
 * - Track job execution in `job_runs` (jobRuns)
 *
 * Notes:
 * - We include cancelled states so that when a fixture transitions NS → POSTPONED (etc.) on the provider,
 *   we pick it up and sync the state; syncFixtures validates transitions via isValidFixtureStateTransition.
 * - The job is gated by the `jobs` table (jobs.enabled).
 */
export const upcomingFixturesJob = UPCOMING_FIXTURES_JOB;

const DEFAULT_DAYS_AHEAD = UPCOMING_FIXTURES_JOB.meta?.daysAhead ?? DAYS_AHEAD;

export async function runUpcomingFixturesJob(
  fastify: FastifyInstance,
  opts: JobRunOpts & { daysAhead?: number }
): Promise<
  StandardJobRunStats & {
    scheduled: number;
    window: { from: string; to: string };
  }
> {
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

  return runJob<
    StandardJobRunStats & {
      scheduled: number;
      window: { from: string; to: string };
    }
  >({
    jobKey: upcomingFixturesJob.key,
    loggerName: "UpcomingFixturesJob",
    opts,
    jobRow,
    meta: { daysAhead },
    skippedResult: (jobRunId) => ({
      jobRunId,
      batchId: null,
      fetched: 0,
      scheduled: 0,
      total: 0,
      ok: 0,
      fail: 0,
      window: {
        from: format(new Date(), "yyyy-MM-dd"),
        to: format(addDays(new Date(), daysAhead), "yyyy-MM-dd"),
      },
      skipped: true,
    }),
    run: async ({ jobRunId }) => {
      const from = format(new Date(), "yyyy-MM-dd");
      const to = format(addDays(new Date(), daysAhead), "yyyy-MM-dd");

      const fetched = await adapter.fetchFixturesBetween(from, to, {
        filters: { fixtureStates: UPCOMING_STATE_IDS },
      });

      if (!fetched.length) {
        return {
          result: {
            jobRunId,
            batchId: null,
            fetched: fetched.length,
            scheduled: 0,
            total: 0,
            ok: 0,
            fail: 0,
            window: { from, to },
            skipped: false,
          },
          rowsAffected: 0,
          meta: {
            window: { from, to },
            daysAhead,
            dryRun: !!opts.dryRun,
            countFetched: fetched.length,
            countScheduled: 0,
            reason: "no-fixtures-in-window",
          },
        };
      }

      if (opts.dryRun) {
        return {
          result: {
            jobRunId,
            batchId: null,
            fetched: fetched.length,
            scheduled: fetched.length,
            total: 0,
            ok: 0,
            fail: 0,
            window: { from, to },
            skipped: false,
          },
          rowsAffected: 0,
          meta: {
            window: { from, to },
            daysAhead,
            dryRun: true,
            countFetched: fetched.length,
            countScheduled: fetched.length,
          },
        };
      }

      let batchId: number | null = null;
      try {
        const batch = await createBatchForJob(
          upcomingFixturesJob.key,
          jobRunId
        );
        batchId = batch.id;

        const result = await syncFixtures(fetched, {
          dryRun: false,
          signal: opts.signal,
          batchId,
          jobRunId,
        });
        const ok = result.inserted + result.updated;

        await finishSeedBatch(batchId, RunStatus.success, {
          itemsTotal: result.total,
          itemsSuccess: ok + result.skipped,
          itemsFailed: result.failed,
          meta: {
            window: { from, to },
            inserted: result.inserted,
            updated: result.updated,
            skipped: result.skipped,
            failed: result.failed,
          },
        });

        return {
          result: {
            jobRunId,
            batchId,
            fetched: fetched.length,
            scheduled: fetched.length,
            total: result.total,
            ok,
            fail: result.failed,
            window: { from, to },
            skipped: false,
          },
          rowsAffected: result.total,
          meta: {
            batchId,
            window: { from, to },
            daysAhead,
            dryRun: false,
            countFetched: fetched.length,
            countScheduled: fetched.length,
            ok,
            fail: result.failed,
            total: result.total,
            inserted: result.inserted,
            updated: result.updated,
            skipped: result.skipped,
          },
        };
      } catch (err) {
        if (batchId != null) {
          await finishSeedBatch(batchId, RunStatus.failed, {
            errorMessage: err instanceof Error ? err.message : String(err),
          });
        }
        throw err;
      }
    },
  });
}
