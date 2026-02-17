import type { FastifyInstance } from "fastify";
import { JobRunOpts } from "../../types/jobs";
import { SYNC_GROUP_FIXTURES_JOB } from "../jobs.definitions";
import { getJobRowOrThrow } from "../jobs.db";
import { runJob } from "../run-job";
import { syncNewFixturesToActiveGroups } from "../../services/api/groups/service/fixture-sync";

/**
 * sync-group-fixtures job
 * ----------------------
 * Goal: attach new fixtures to active groups with leagues/teams selection mode.
 *
 * Groups created with leagues/teams mode get a one-time snapshot of fixtures at creation.
 * New fixtures that enter the DB later (knockout stages, cups, etc.) are not automatically
 * added. This job runs hourly to find and attach such fixtures.
 */
export const syncGroupFixturesJob = SYNC_GROUP_FIXTURES_JOB;

export async function runSyncGroupFixturesJob(
  fastify: FastifyInstance,
  opts: JobRunOpts = {}
) {
  const jobRow = await getJobRowOrThrow(syncGroupFixturesJob.key);

  return runJob({
    jobKey: syncGroupFixturesJob.key,
    loggerName: "SyncGroupFixturesJob",
    opts,
    jobRow,
    meta: {},
    skippedResult: (jobRunId) => ({
      jobRunId,
      groupsProcessed: 0,
      fixturesAttached: 0,
      skipped: true,
    }),
    run: async ({ jobRunId }) => {
      const result = await syncNewFixturesToActiveGroups({
        dryRun: !!opts.dryRun,
        signal: opts.signal,
      });

      return {
        result: {
          jobRunId,
          groupsProcessed: result.groupsProcessed,
          fixturesAttached: result.fixturesAttached,
          skipped: false,
        },
        rowsAffected: result.fixturesAttached,
        meta: {
          groupsProcessed: result.groupsProcessed,
          fixturesAttached: result.fixturesAttached,
          dryRun: !!opts.dryRun,
        },
      };
    },
  });
}
