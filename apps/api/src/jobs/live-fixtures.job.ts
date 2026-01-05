import type { FastifyInstance } from "fastify";
import { SportMonksAdapter } from "@repo/sports-data/adapters/sportmonks";
import { JobTriggerBy, prisma, RunStatus, RunTrigger } from "@repo/db";
import { seedFixtures } from "../etl/seeds/seed.fixtures";
import type { JobRunOpts, StandardJobRunStats } from "../types/jobs";
import { LIVE_FIXTURES_JOB } from "./jobs.definitions";
import { getJobRowOrThrow } from "./jobs.db";

/**
 * live-fixtures job
 * ----------------
 * Goal: Keep our DB updated with fixtures that are currently in-play (LIVE/HT/etc.)
 *
 * What it does:
 * - Fetch live fixtures from SportMonks (livescores/inplay endpoint)
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
 * 4) Build SportMonks adapter from env.
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

  const startedAtMs = Date.now();
  const jobRun = await prisma.jobRuns.create({
    data: {
      jobKey: liveFixturesJob.key,
      status: RunStatus.running,
      trigger,
      triggeredBy: opts.triggeredBy ?? null,
      triggeredById: opts.triggeredById ?? null,
      meta: {
        dryRun: !!opts.dryRun,
        ...(opts.meta ?? {}),
      },
    },
    select: { id: true },
  });

  if (!jobRow.enabled && isCronTrigger) {
    await prisma.jobRuns.update({
      where: { id: jobRun.id },
      data: {
        status: RunStatus.skipped,
        finishedAt: new Date(),
        durationMs: Date.now() - startedAtMs,
        rowsAffected: 0,
        meta: {
          dryRun: !!opts.dryRun,
          reason: "disabled",
        },
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

  // Build adapter config from env. If env is missing, skip safely (avoids throwing on boot).
  const token = process.env.SPORTMONKS_API_TOKEN;
  const footballBaseUrl = process.env.SPORTMONKS_FOOTBALL_BASE_URL;
  const coreBaseUrl = process.env.SPORTMONKS_CORE_BASE_URL;
  const authMode =
    (process.env.SPORTMONKS_AUTH_MODE as "query" | "header") || "query";

  if (!token || !footballBaseUrl || !coreBaseUrl) {
    fastify.log.warn(
      "live-fixtures: missing SPORTMONKS env vars; skipping job"
    );
    await prisma.jobRuns.update({
      where: { id: jobRun.id },
      data: {
        status: RunStatus.skipped,
        finishedAt: new Date(),
        durationMs: Date.now() - startedAtMs,
        rowsAffected: 0,
        meta: {
          dryRun: !!opts.dryRun,
          reason: "missing-env",
          ...(opts.meta ?? {}),
        },
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
    const adapter = new SportMonksAdapter({
      token,
      footballBaseUrl,
      coreBaseUrl,
      authMode,
    });

    const fixtures = await adapter.fetchLiveFixtures({
      include: ["state", "scores", "participants"],
    });

    if (opts.dryRun) {
      await prisma.jobRuns.update({
        where: { id: jobRun.id },
        data: {
          status: RunStatus.success,
          finishedAt: new Date(),
          durationMs: Date.now() - startedAtMs,
          rowsAffected: 0,
          meta: {
            dryRun: true,
            fetched: fixtures.length,
            ...(opts.meta ?? {}),
          },
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

    const result = await seedFixtures(fixtures, {
      version: "v1",
      trigger,
      triggeredBy: (opts.triggeredBy as unknown as string) ?? null,
      triggeredById: opts.triggeredById ?? null,
      dryRun: false,
    });

    await prisma.jobRuns.update({
      where: { id: jobRun.id },
      data: {
        status: RunStatus.success,
        finishedAt: new Date(),
        durationMs: Date.now() - startedAtMs,
        rowsAffected: result?.total ?? fixtures.length,
        meta: {
          fetched: fixtures.length,
          batchId: result?.batchId ?? null,
          ok: result?.ok ?? 0,
          fail: result?.fail ?? 0,
          total: result?.total ?? 0,
          ...(opts.meta ?? {}),
        },
      },
    });

    return {
      jobRunId: jobRun.id,
      fetched: fixtures.length,
      batchId: result?.batchId ?? null,
      total: result?.total,
      ok: result?.ok,
      fail: result?.fail,
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
          dryRun: !!opts.dryRun,
          ...(opts.meta ?? {}),
        },
      },
    });
    throw err;
  }
}
