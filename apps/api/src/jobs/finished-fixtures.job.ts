import type { FastifyInstance } from "fastify";
import { SportMonksAdapter } from "@repo/sports-data/adapters/sportmonks";
import {
  FixtureState as DbFixtureState,
  JobTriggerBy,
  RunStatus,
  RunTrigger,
  prisma,
} from "@repo/db";
import { JobRunOpts } from "../types/jobs";
import { FINISHED_FIXTURES_JOB } from "./jobs.definitions";
import { getJobRowOrThrow } from "./jobs.db";
// NOTE: We now have a dedicated `jobRuns` table for job executions (see prisma schema).

/**
 * finished-fixtures job
 * --------------------
 * Goal: keep our DB fixtures in sync when matches finish.
 *
 * Why this exists:
 * - We sometimes have fixtures stuck in LIVE in the DB.
 * - After a fixture has been LIVE "too long", we treat it as a candidate to re-check.
 * - We then ask SportMonks for the same fixtures, but only those now in FT (finished),
 *   and update our DB state + result + derived scores.
 */
export const finishedFixturesJob = FINISHED_FIXTURES_JOB;

/**
 * Extract numeric scores from a normalized result string.
 * Accepts either "2-1" or "2:1" (we normalize ":" -> "-" elsewhere).
 *
 * Why we parse:
 * - Provider/DB result formats are strings, but we also store numeric score fields.
 * - Parsing here centralizes the logic and keeps DB writes consistent.
 */
function parseScores(result: string | null | undefined): {
  homeScore: number | null;
  awayScore: number | null;
} {
  if (!result) return { homeScore: null, awayScore: null };
  const match = result.trim().match(/^(\d+)[-:](\d+)$/);
  if (!match) return { homeScore: null, awayScore: null };
  return {
    homeScore: Number(match[1]),
    awayScore: Number(match[2]),
  };
}

/**
 * Provider sometimes returns "0:0" while our DB/UI standard is "0-0".
 * Normalize to "-" so comparisons + DB values stay consistent.
 *
 * Why normalize:
 * - Prevents duplicate/unequal strings representing the same value.
 * - Makes UI and DB comparisons stable.
 */
function normalizeResult(result: string | null | undefined): string | null {
  if (!result) return null;
  const trimmed = result.trim();
  if (!trimmed) return null;
  // keep DB consistent with admin update route: use "-"
  return trimmed.replace(/:/g, "-");
}

/**
 * Prisma expects its own enum type. Provider/DTO state is a string union with the same values.
 * We intentionally coerce here (values must match the Prisma enum values in schema.prisma).
 *
 * Why cast:
 * - Provider states come as strings; Prisma expects its generated enum type.
 * - Values are aligned by design in our schema.
 */
function coerceDbFixtureState(state: string): DbFixtureState {
  // Provider DTOs use string values that match Prisma enum values (NS, LIVE, FT, CAN, INT, ...)
  return state as unknown as DbFixtureState;
}

/** Small helper to avoid huge provider requests. */
function chunk<T>(arr: T[], n: number): T[][] {
  if (n <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

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
  const maxLiveAgeHours = opts.maxLiveAgeHours ?? 2;

  // Jobs are seeded in DB. Missing row is a deployment/config error.
  const jobRow = await getJobRowOrThrow(finishedFixturesJob.key);

  // Disabled should only prevent cron runs. Manual "Run" should still work.
  const isCronTrigger = opts.triggeredBy === JobTriggerBy.cron_scheduler;

  // Create a job run record (start)
  const trigger =
    opts.trigger ??
    (opts.triggeredBy === JobTriggerBy.cron_scheduler
      ? RunTrigger.auto
      : RunTrigger.manual);

  const startedAtMs = Date.now();
  const jobRun = await prisma.jobRuns.create({
    data: {
      jobKey: finishedFixturesJob.key,
      status: RunStatus.running,
      trigger,
      triggeredBy: opts.triggeredBy ?? null,
      triggeredById: opts.triggeredById ?? null,
      meta: {
        maxLiveAgeHours,
        dryRun: !!opts.dryRun,
      },
    },
    select: { id: true, startedAt: true },
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
          maxLiveAgeHours,
          dryRun: !!opts.dryRun,
          reason: "disabled",
        },
      },
    });
    return { candidates: 0, fetched: 0, updated: 0, skipped: true };
  }

  // Build adapter config from env. If env is missing, skip safely (avoids throwing on boot).
  const token = process.env.SPORTMONKS_API_TOKEN;
  const footballBaseUrl = process.env.SPORTMONKS_FOOTBALL_BASE_URL;
  const coreBaseUrl = process.env.SPORTMONKS_CORE_BASE_URL;
  const authMode =
    (process.env.SPORTMONKS_AUTH_MODE as "query" | "header") || "query";

  if (!token || !footballBaseUrl || !coreBaseUrl) {
    fastify.log.warn(
      "finished-fixtures: missing SPORTMONKS env vars; skipping job"
    );
    await prisma.jobRuns.update({
      where: { id: jobRun.id },
      data: {
        status: RunStatus.skipped,
        finishedAt: new Date(),
        durationMs: Date.now() - startedAtMs,
        rowsAffected: 0,
        meta: {
          maxLiveAgeHours,
          dryRun: !!opts.dryRun,
          reason: "missing-env",
        },
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
      await prisma.jobRuns.update({
        where: { id: jobRun.id },
        data: {
          status: RunStatus.success,
          finishedAt: new Date(),
          durationMs: Date.now() - startedAtMs,
          rowsAffected: 0,
          meta: {
            maxLiveAgeHours,
            dryRun: !!opts.dryRun,
            reason: "no-candidates",
          },
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

    // SportMonks expects numeric ids; our DB stores externalId as bigint.
    const ids = candidates
      .map((c) => Number(c.externalId))
      .filter((n) => Number.isFinite(n));

    if (!ids.length) {
      await prisma.jobRuns.update({
        where: { id: jobRun.id },
        data: {
          status: RunStatus.success,
          finishedAt: new Date(),
          durationMs: Date.now() - startedAtMs,
          rowsAffected: 0,
          meta: {
            maxLiveAgeHours,
            dryRun: !!opts.dryRun,
            reason: "no-valid-external-ids",
            candidates: candidates.length,
          },
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
     * 2) Ask SportMonks for the same fixtures, but only those that are now finished (FT).
     * SportMonks "fixtureStates=5" == FT.
     */
    const adapter = new SportMonksAdapter({
      token,
      footballBaseUrl,
      coreBaseUrl,
      authMode,
    });

    let fetched: Awaited<ReturnType<typeof adapter.fetchFixturesByIds>> = [];
    for (const group of chunk(ids, 50)) {
      const part = await adapter.fetchFixturesByIds(group, {
        include: ["state", "scores", "participants"],
        filters: { fixtureStates: "5" }, // 5 = Finished (FT)
        perPage: 50,
      });
      if (part?.length) fetched = fetched.concat(part);
    }

    if (!fetched.length) {
      await prisma.jobRuns.update({
        where: { id: jobRun.id },
        data: {
          status: RunStatus.success,
          finishedAt: new Date(),
          durationMs: Date.now() - startedAtMs,
          rowsAffected: 0,
          meta: {
            maxLiveAgeHours,
            dryRun: !!opts.dryRun,
            reason: "no-finished-fixtures",
            candidates: candidates.length,
          },
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
      await prisma.jobRuns.update({
        where: { id: jobRun.id },
        data: {
          status: RunStatus.success,
          finishedAt: new Date(),
          durationMs: Date.now() - startedAtMs,
          rowsAffected: 0,
          meta: {
            maxLiveAgeHours,
            dryRun: true,
            candidates: candidates.length,
            fetched: fetched.length,
          },
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
     * 3) Write updates back into our DB fixtures.
     * We update:
     * - state (FT)
     * - result (normalized to "x-y")
     * - derived homeScore/awayScore (nullable)
     */
    let updated = 0;
    let failed = 0;
    for (const group of chunk(fetched, 50)) {
      const ops = group.map((fx) => {
        const result = normalizeResult(fx.result);
        const { homeScore, awayScore } = parseScores(result);
        const state = coerceDbFixtureState(String(fx.state));
        return prisma.fixtures.update({
          where: { externalId: BigInt(fx.externalId) },
          data: {
            state,
            result,
            homeScore,
            awayScore,
            updatedAt: new Date(),
          },
          select: { id: true },
        });
      });
      const settled = await Promise.allSettled(ops);
      for (const s of settled) {
        if (s.status === "fulfilled") updated += 1;
        else failed += 1;
      }
    }

    await prisma.jobRuns.update({
      where: { id: jobRun.id },
      data: {
        status: RunStatus.success,
        finishedAt: new Date(),
        durationMs: Date.now() - startedAtMs,
        rowsAffected: updated,
        meta: {
          maxLiveAgeHours,
          dryRun: false,
          candidates: candidates.length,
          fetched: fetched.length,
          updated,
          failed,
        },
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
          maxLiveAgeHours,
          dryRun: !!opts.dryRun,
          jobKey: finishedFixturesJob.key,
        },
      },
    });
    throw err;
  }
}
