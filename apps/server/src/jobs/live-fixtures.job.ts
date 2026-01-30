import type { FastifyInstance } from "fastify";
import { adapter } from "../utils/adapter";
import { syncFixtures } from "../etl/sync/sync.fixtures";
import type { JobRunOpts, StandardJobRunStats } from "../types/jobs";
import { LIVE_FIXTURES_JOB } from "./jobs.definitions";
import { runJob } from "./run-job";

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

export async function runLiveFixturesJob(
  fastify: FastifyInstance,
  opts: JobRunOpts = {}
): Promise<StandardJobRunStats> {
  return runJob<StandardJobRunStats>({
    jobKey: liveFixturesJob.key,
    loggerName: "LiveFixturesJob",
    opts,
    skippedResult: (jobRunId) => ({
      jobRunId,
      fetched: 0,
      total: 0,
      ok: 0,
      fail: 0,
      batchId: null,
      skipped: true,
    }),
    run: async ({ jobRunId }) => {
      const fixtures = await adapter.fetchLiveFixtures({
        includeScores: true,
      });

      if (opts.dryRun) {
        return {
          result: {
            jobRunId,
            fetched: fixtures.length,
            total: 0,
            ok: 0,
            fail: 0,
            batchId: null,
            skipped: false,
          },
          rowsAffected: 0,
          meta: {
            dryRun: true,
            fetched: fixtures.length,
            ...(opts.meta ?? {}),
          },
        };
      }

      const result = await syncFixtures(fixtures, {
        dryRun: false,
        signal: opts.signal,
      });
      const ok = result.inserted + result.updated;
      return {
        result: {
          jobRunId,
          fetched: fixtures.length,
          batchId: null,
          total: result.total,
          ok,
          fail: result.failed,
          skipped: false,
        },
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
      };
    },
  });
}
