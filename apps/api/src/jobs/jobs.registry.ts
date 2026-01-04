import type { FastifyInstance } from "fastify";
import { JobTriggerBy, RunTrigger } from "@repo/db";
import type { JobRunOpts } from "../types/jobs";

import {
  UPCOMING_FIXTURES_JOB,
  LIVE_FIXTURES_JOB,
  FINISHED_FIXTURES_JOB,
  UPDATE_PREMATCH_ODDS_JOB,
} from "./jobs.definitions";

export type RunnableJobDefinition = {
  key: string;
  description: string;
  scheduleCron: string | null;
  run: (fastify: FastifyInstance, opts: JobRunOpts) => Promise<unknown>;
};

// IMPORTANT:
// Do not import job modules at file load time. This module is pulled in by routes/plugins
// during Fastify autoload on Render, and `tsx` compilation makes heavy imports slow.
// Instead, load each job implementation only when it actually runs.
type Runner = (fastify: FastifyInstance, opts: JobRunOpts) => Promise<unknown>;
const RUNNERS: Record<string, Runner> = {
  [UPCOMING_FIXTURES_JOB.key]: async (fastify, opts) => {
    const { runUpcomingFixturesJob } = await import("./upcoming-fixtures.job");
    return runUpcomingFixturesJob(fastify, { daysAhead: 3, ...opts });
  },
  [LIVE_FIXTURES_JOB.key]: async (fastify, opts) => {
    const { runLiveFixturesJob } = await import("./live-fixtures.job");
    return runLiveFixturesJob(fastify, opts);
  },
  [FINISHED_FIXTURES_JOB.key]: async (fastify, opts) => {
    const { runFinishedFixturesJob } = await import("./finished-fixtures.job");
    return runFinishedFixturesJob(fastify, { maxLiveAgeHours: 2, ...opts });
  },
  [UPDATE_PREMATCH_ODDS_JOB.key]: async (fastify, opts) => {
    const { runUpdatePrematchOddsJob } =
      await import("./update-prematch-odds.job");
    return runUpdatePrematchOddsJob(fastify, { daysAhead: 7, ...opts });
  },
};

export const RUNNABLE_JOBS: RunnableJobDefinition[] = [
  {
    key: UPCOMING_FIXTURES_JOB.key,
    description: UPCOMING_FIXTURES_JOB.description,
    scheduleCron: UPCOMING_FIXTURES_JOB.scheduleCron ?? null,
    run: RUNNERS[UPCOMING_FIXTURES_JOB.key]!,
  },
  {
    key: LIVE_FIXTURES_JOB.key,
    description: LIVE_FIXTURES_JOB.description,
    scheduleCron: LIVE_FIXTURES_JOB.scheduleCron ?? null,
    run: RUNNERS[LIVE_FIXTURES_JOB.key]!,
  },
  {
    key: FINISHED_FIXTURES_JOB.key,
    description: FINISHED_FIXTURES_JOB.description,
    scheduleCron: FINISHED_FIXTURES_JOB.scheduleCron ?? null,
    run: RUNNERS[FINISHED_FIXTURES_JOB.key]!,
  },
  {
    key: UPDATE_PREMATCH_ODDS_JOB.key,
    description: UPDATE_PREMATCH_ODDS_JOB.description,
    scheduleCron: UPDATE_PREMATCH_ODDS_JOB.scheduleCron ?? null,
    run: RUNNERS[UPDATE_PREMATCH_ODDS_JOB.key]!,
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
