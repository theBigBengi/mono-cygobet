import type { FastifyInstance } from "fastify";
import { JobTriggerBy, RunTrigger } from "@repo/db";
import type { JobRunOpts } from "../types/jobs";

/**
 * Jobs registry
 * -------------
 * Purpose:
 * - Central “catalog” of runnable jobs in this API build.
 * - Provides lookup helpers for the scheduler and admin “Run now” endpoints.
 *
 * Why it exists (instead of importing jobs everywhere):
 * - Fastify autoload loads routes/plugins at startup; importing heavy job modules there is slow.
 * - We use dynamic imports so jobs are loaded only when executed.
 */
import {
  UPCOMING_FIXTURES_JOB,
  LIVE_FIXTURES_JOB,
  FINISHED_FIXTURES_JOB,
  UPDATE_PREMATCH_ODDS_JOB,
  SYNC_GROUP_FIXTURES_JOB,
} from "./jobs.definitions";

export type RunnableJobDefinition = {
  /** DB primary key / stable identifier used everywhere (routes, scheduler, job_runs). */
  key: string;
  /** Human readable description for UI/observability. */
  description: string;
  /** Default schedule (5-field cron) used only as a fallback in tooling (DB is source of truth). */
  scheduleCron: string | null;
  /** Runtime entrypoint that executes the job. */
  run: (fastify: FastifyInstance, opts: JobRunOpts) => Promise<unknown>;
};

// IMPORTANT:
// Do not import job modules at file load time. This module is pulled in by routes/plugins
// during Fastify autoload on Render, and `tsx` compilation makes heavy imports slow.
// Instead, load each job implementation only when it actually runs.
type Runner = (fastify: FastifyInstance, opts: JobRunOpts) => Promise<unknown>;

/**
 * RUNNERS
 * -------
 * Map jobKey -> async loader.
 *
 * Why dynamic imports:
 * - Keeps Fastify startup fast and predictable.
 * - Jobs can import heavy adapters/seeders without slowing down route/plugin registration.
 */
const RUNNERS: Record<string, Runner> = {
  [UPCOMING_FIXTURES_JOB.key]: async (fastify, opts) => {
    const { runUpcomingFixturesJob } = await import("./upcoming-fixtures.job");
    return runUpcomingFixturesJob(fastify, opts);
  },
  [LIVE_FIXTURES_JOB.key]: async (fastify, opts) => {
    const { runLiveFixturesJob } = await import("./live-fixtures.job");
    return runLiveFixturesJob(fastify, opts);
  },
  [FINISHED_FIXTURES_JOB.key]: async (fastify, opts) => {
    const { runFinishedFixturesJob } = await import("./finished-fixtures.job");
    return runFinishedFixturesJob(fastify, opts);
  },
  [UPDATE_PREMATCH_ODDS_JOB.key]: async (fastify, opts) => {
    const { runUpdatePrematchOddsJob } =
      await import("./update-prematch-odds.job");
    return runUpdatePrematchOddsJob(fastify, opts);
  },
  [/* cleanup-expired-sessions */ "cleanup-expired-sessions"]: async (fastify, opts) => {
    const { runCleanupExpiredSessionsJob } = await import(
      "./cleanup-expired-sessions.job"
    );
    return runCleanupExpiredSessionsJob(fastify, opts);
  },
  [SYNC_GROUP_FIXTURES_JOB.key]: async (fastify, opts) => {
    const { runSyncGroupFixturesJob } = await import(
      "./sync-group-fixtures.job"
    );
    return runSyncGroupFixturesJob(fastify, opts);
  },
};

/**
 * RUNNABLE_JOBS
 * ------------
 * The “catalog” of runnable jobs for:
 * - scheduler (what can be scheduled)
 * - admin actions route (what can be run manually)
 *
 * NOTE:
 * - Runtime scheduling uses DB `jobs.scheduleCron`.
 * - These `scheduleCron` values are defaults/documentation, not the live source of truth.
 */
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
  {
    key: "cleanup-expired-sessions",
    description: "Delete expired admin sessions from DB",
    scheduleCron: "30 * * * *",
    run: RUNNERS["cleanup-expired-sessions"]!,
  },
  {
    key: SYNC_GROUP_FIXTURES_JOB.key,
    description: SYNC_GROUP_FIXTURES_JOB.description,
    scheduleCron: SYNC_GROUP_FIXTURES_JOB.scheduleCron ?? null,
    run: RUNNERS[SYNC_GROUP_FIXTURES_JOB.key]!,
  },
];

/** True if the job key is known and runnable by this API build. */
export function isJobRunnable(jobKey: string): boolean {
  return RUNNABLE_JOBS.some((j) => j.key === jobKey);
}

/** Get a runnable job “run” function for a given key (or null if not runnable/unknown). */
export function getJobRunner(jobKey: string) {
  return RUNNABLE_JOBS.find((j) => j.key === jobKey)?.run ?? null;
}

/** Get the full runnable job descriptor for a given key (or null). */
export function getRunnableJob(jobKey: string) {
  return RUNNABLE_JOBS.find((j) => j.key === jobKey) ?? null;
}

/**
 * Convenience defaults for admin-triggered runs.
 *
 * Why it exists:
 * - When the admin UI triggers a run, we want consistent attribution in `job_runs`:
 *   - trigger = manual
 *   - triggeredBy = admin_ui
 */
export function makeAdminRunOpts(body?: { dryRun?: boolean }): JobRunOpts {
  return {
    dryRun: !!body?.dryRun,
    trigger: RunTrigger.manual,
    triggeredBy: JobTriggerBy.admin_ui,
  };
}
