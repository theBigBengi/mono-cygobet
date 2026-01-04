import type { FastifyInstance } from "fastify";
import { JobTriggerBy, RunTrigger } from "@repo/db";
import type { JobRunOpts } from "../types/jobs";

import {
  UPCOMING_FIXTURES_JOB,
  LIVE_FIXTURES_JOB,
  FINISHED_FIXTURES_JOB,
  UPDATE_PREMATCH_ODDS_JOB,
} from "./jobs.definitions";
import { runUpcomingFixturesJob } from "./upcoming-fixtures.job";
import { runLiveFixturesJob } from "./live-fixtures.job";
import { runFinishedFixturesJob } from "./finished-fixtures.job";
import { runUpdatePrematchOddsJob } from "./update-prematch-odds.job";

export type RunnableJobDefinition = {
  key: string;
  description: string;
  scheduleCron: string | null;
  run: (fastify: FastifyInstance, opts: JobRunOpts) => Promise<unknown>;
};

export const RUNNABLE_JOBS: RunnableJobDefinition[] = [
  {
    key: UPCOMING_FIXTURES_JOB.key,
    description: UPCOMING_FIXTURES_JOB.description,
    scheduleCron: UPCOMING_FIXTURES_JOB.scheduleCron ?? null,
    run: (fastify, opts) =>
      runUpcomingFixturesJob(fastify, {
        daysAhead: 3,
        ...opts,
      }),
  },
  {
    key: LIVE_FIXTURES_JOB.key,
    description: LIVE_FIXTURES_JOB.description,
    scheduleCron: LIVE_FIXTURES_JOB.scheduleCron ?? null,
    run: (fastify, opts) => runLiveFixturesJob(fastify, opts),
  },
  {
    key: FINISHED_FIXTURES_JOB.key,
    description: FINISHED_FIXTURES_JOB.description,
    scheduleCron: FINISHED_FIXTURES_JOB.scheduleCron ?? null,
    run: (fastify, opts) =>
      runFinishedFixturesJob(fastify, {
        maxLiveAgeHours: 2,
        ...opts,
      }),
  },
  {
    key: UPDATE_PREMATCH_ODDS_JOB.key,
    description: UPDATE_PREMATCH_ODDS_JOB.description,
    scheduleCron: UPDATE_PREMATCH_ODDS_JOB.scheduleCron ?? null,
    run: (fastify, opts) =>
      runUpdatePrematchOddsJob(fastify, {
        daysAhead: 7,
        ...opts,
      }),
  },
];

export function isJobRunnable(jobKey: string): boolean {
  return RUNNABLE_JOBS.some((j) => j.key === jobKey);
}

export function getJobRunner(jobKey: string) {
  return RUNNABLE_JOBS.find((j) => j.key === jobKey)?.run ?? null;
}

export function getRunnableJob(jobKey: string) {
  return RUNNABLE_JOBS.find((j) => j.key === jobKey) ?? null;
}

/**
 * Convenience defaults for admin-triggered runs.
 */
export function makeAdminRunOpts(body?: { dryRun?: boolean }): JobRunOpts {
  return {
    dryRun: !!body?.dryRun,
    trigger: RunTrigger.manual,
    triggeredBy: JobTriggerBy.admin_ui,
  };
}
