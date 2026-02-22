/**
 * data-quality-check job
 * ----------------------
 * Goal: Report data quality issues for admin monitoring.
 *
 * Checks:
 * 1. Finished fixtures without scores (FT/AET/FT_PEN with null homeScore90 or awayScore90)
 *
 * This job does not fix issues - it only reports them.
 * Run manually from admin or schedule daily for monitoring.
 */

import type { FastifyInstance } from "fastify";
import { prisma } from "@repo/db";
import type { FixtureState } from "@repo/db";
import { FINISHED_STATES } from "@repo/utils";
import { JobRunOpts } from "../../types/jobs";
import { DATA_QUALITY_CHECK_JOB } from "../jobs.definitions";
import { getJobRowOrThrow } from "../jobs.db";
import { runJob } from "../run-job";

export const dataQualityCheckJob = DATA_QUALITY_CHECK_JOB;

const FINISHED_STATES_ARR = [...FINISHED_STATES] as FixtureState[];

export async function runDataQualityCheckJob(
  _fastify: FastifyInstance,
  opts: JobRunOpts = {}
) {
  const jobRow = await getJobRowOrThrow(dataQualityCheckJob.key);

  return runJob({
    jobKey: dataQualityCheckJob.key,
    loggerName: "DataQualityCheckJob",
    opts,
    jobRow,
    meta: {},
    skippedResult: () => ({
      finishedWithoutScores: 0,
      skipped: true,
    }),
    run: async ({ jobRunId, log }) => {
      log.info("Starting data quality check");

      const finishedWithoutScores = await prisma.fixtures.count({
        where: {
          externalId: { gte: "0" },
          state: { in: FINISHED_STATES_ARR },
          OR: [{ homeScore90: null }, { awayScore90: null }],
        },
      });

      log.info(
        { finishedWithoutScores },
        "Data quality check completed"
      );

      return {
        result: {
          jobRunId,
          finishedWithoutScores,
          skipped: false,
        },
        rowsAffected: finishedWithoutScores,
        meta: {
          finishedWithoutScores,
          dryRun: !!opts.dryRun,
        },
      };
    },
  });
}
