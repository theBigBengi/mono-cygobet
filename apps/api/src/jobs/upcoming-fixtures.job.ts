import type { FastifyInstance } from "fastify";
import { addDays, format } from "date-fns";
import { SportMonksAdapter } from "@repo/sports-data/adapters/sportmonks";
import type { FixtureDTO } from "@repo/types/sport-data/common";
import { JobTriggerBy, RunStatus, RunTrigger, prisma } from "@repo/db";
import { seedFixtures } from "../etl/seeds/seed.fixtures";
import { JobRunOpts, type StandardJobRunStats } from "../types/jobs";
import { UPCOMING_FIXTURES_JOB } from "./jobs.definitions";
import { getJobRowOrThrow } from "./jobs.db";

/**
 * upcoming-fixtures job
 * --------------------
 * Goal: Keep our DB populated with upcoming fixtures (NS) for a forward-looking window.
 *
 * What it does:
 * - Fetch fixtures from SportMonks between [today .. today+daysAhead]
 * - Filter to NS (Not Started)
 * - Upsert them into our DB using the existing fixtures seeder (which uses Prisma upsert)
 * - Track job execution in `job_runs` (jobRuns)
 *
 * Notes:
 * - This is intentionally "NS only" so it doesn't interfere with state progression jobs (LIVE/FT).
 * - The job is gated by the `jobs` table (jobs.enabled).
 */
export const upcomingFixturesJob = UPCOMING_FIXTURES_JOB;

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
  opts: JobRunOpts & { daysAhead?: number } = { daysAhead: 3 }
): Promise<
  StandardJobRunStats & {
    scheduled: number;
    window: { from: string; to: string };
  }
> {
  const daysAhead = opts.daysAhead ?? 3;

  // Jobs are seeded in DB. Missing row is a deployment/config error.
  const jobRow = await getJobRowOrThrow(upcomingFixturesJob.key);

  // Disabled should only prevent cron runs. Manual "Run" should still work.
  const isCronTrigger = opts.triggeredBy === JobTriggerBy.cron_scheduler;

  const trigger =
    opts.trigger ??
    (opts.triggeredBy === JobTriggerBy.cron_scheduler
      ? RunTrigger.auto
      : RunTrigger.manual);

  const startedAtMs = Date.now();
  const jobRun = await prisma.jobRuns.create({
    data: {
      jobKey: upcomingFixturesJob.key,
      status: RunStatus.running,
      trigger,
      triggeredBy: opts.triggeredBy ?? null,
      triggeredById: opts.triggeredById ?? null,
      meta: { daysAhead, dryRun: !!opts.dryRun, ...opts.meta },
    },
    select: { id: true },
  });

  // Date-only format works with SportMonks "between" endpoint and is URL-encoded in the adapter.
  const from = format(new Date(), "yyyy-MM-dd");
  const to = format(addDays(new Date(), daysAhead), "yyyy-MM-dd");

  if (!jobRow.enabled && isCronTrigger) {
    await prisma.jobRuns.update({
      where: { id: jobRun.id },
      data: {
        status: RunStatus.skipped,
        finishedAt: new Date(),
        durationMs: Date.now() - startedAtMs,
        rowsAffected: 0,
        meta: {
          window: { from, to },
          daysAhead,
          dryRun: !!opts.dryRun,
          reason: "disabled",
        },
      },
    });
    return {
      jobRunId: jobRun.id,
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

  // Build adapter config from env. If env is missing, skip safely (avoids throwing on boot).
  const token = process.env.SPORTMONKS_API_TOKEN;
  const footballBaseUrl = process.env.SPORTMONKS_FOOTBALL_BASE_URL;
  const coreBaseUrl = process.env.SPORTMONKS_CORE_BASE_URL;
  const authMode =
    (process.env.SPORTMONKS_AUTH_MODE as "query" | "header") || "query";

  if (!token || !footballBaseUrl || !coreBaseUrl) {
    fastify.log.warn(
      "upcoming-fixtures: missing SPORTMONKS env vars; skipping"
    );
    await prisma.jobRuns.update({
      where: { id: jobRun.id },
      data: {
        status: RunStatus.skipped,
        finishedAt: new Date(),
        durationMs: Date.now() - startedAtMs,
        rowsAffected: 0,
        meta: {
          daysAhead,
          dryRun: !!opts.dryRun,
          window: { from, to },
          reason: "missing-env",
        },
      },
    });
    return {
      jobRunId: jobRun.id,
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

  try {
    const adapter = new SportMonksAdapter({
      token,
      footballBaseUrl,
      coreBaseUrl,
      authMode,
    });

    // Ask SportMonks for scheduled fixtures only (fixtureStates=1 == NS).
    const fetched = await adapter.fetchFixturesBetween(from, to, {
      filters: { fixtureStates: "1" },
    });

    // Defensive filter (in case provider returns extra states).
    const scheduled = fetched.filter(isNotStarted);

    if (!scheduled.length) {
      await prisma.jobRuns.update({
        where: { id: jobRun.id },
        data: {
          status: RunStatus.success,
          finishedAt: new Date(),
          durationMs: Date.now() - startedAtMs,
          rowsAffected: 0,
          meta: {
            window: { from, to },
            daysAhead,
            dryRun: !!opts.dryRun,
            countFetched: fetched.length,
            countScheduled: 0,
            reason: "no-upcoming-ns",
          },
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
      await prisma.jobRuns.update({
        where: { id: jobRun.id },
        data: {
          status: RunStatus.success,
          finishedAt: new Date(),
          durationMs: Date.now() - startedAtMs,
          rowsAffected: 0,
          meta: {
            window: { from, to },
            daysAhead,
            dryRun: true,
            countFetched: fetched.length,
            countScheduled: scheduled.length,
          },
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

    await prisma.jobRuns.update({
      where: { id: jobRun.id },
      data: {
        status: RunStatus.success,
        finishedAt: new Date(),
        durationMs: Date.now() - startedAtMs,
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
        },
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
  } catch (err: any) {
    await prisma.jobRuns.update({
      where: { id: jobRun.id },
      data: {
        status: RunStatus.failed,
        finishedAt: new Date(),
        durationMs: Date.now() - startedAtMs,
        rowsAffected: 0,
        errorMessage: String(err?.message ?? err).slice(0, 1000),
        errorStack: String(err?.stack ?? "").slice(0, 2000),
        meta: {
          window: { from, to },
          daysAhead,
          dryRun: !!opts.dryRun,
          jobKey: upcomingFixturesJob.key,
        },
      },
    });
    throw err;
  }
}
