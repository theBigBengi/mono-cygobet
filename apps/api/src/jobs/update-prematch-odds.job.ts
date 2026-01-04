import type { FastifyInstance } from "fastify";
import { addDays, format } from "date-fns";
import { SportMonksAdapter } from "@repo/sports-data/adapters/sportmonks";
import type { OddsDTO } from "@repo/types/sport-data/common";
import { JobTriggerBy, RunStatus, RunTrigger, prisma } from "@repo/db";

import type { JobRunOpts } from "../types/jobs";
import { seedOdds } from "../etl/seeds/seed.odds";
import { UPDATE_PREMATCH_ODDS_JOB } from "./jobs.definitions";
import { ensureJobRow } from "./jobs.db";

/**
 * update-prematch-odds job
 * -----------------------
 * Ported from groups-server `PrematchOddsWindowJob`.
 *
 * Fetches prematch odds for a rolling window (today -> today+daysAhead)
 * and upserts them into DB via `seedOdds`.
 */
export const updatePrematchOddsJob = UPDATE_PREMATCH_ODDS_JOB;

export async function runUpdatePrematchOddsJob(
  fastify: FastifyInstance,
  opts: JobRunOpts & { daysAhead?: number; filters?: string } = {}
): Promise<{
  jobRunId: number;
  batchId?: number | null;
  fetched: number;
  ok?: number;
  fail?: number;
  total?: number;
  window: { from: string; to: string };
  skipped: boolean;
}> {
  const daysAhead = opts.daysAhead ?? 7;
  const filters = opts.filters ?? "bookmakers:1;markets:1,57;";

  // Ensure job row exists in DB (create only; do not overwrite admin edits).
  const jobRow = await ensureJobRow(updatePrematchOddsJob);

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
      jobKey: updatePrematchOddsJob.key,
      status: RunStatus.running,
      trigger,
      triggeredBy: opts.triggeredBy ?? null,
      triggeredById: opts.triggeredById ?? null,
      meta: {
        daysAhead,
        filters,
        dryRun: !!opts.dryRun,
        ...(opts.meta ?? {}),
      },
    },
    select: { id: true },
  });

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
          filters,
          dryRun: !!opts.dryRun,
          reason: "disabled",
        },
      },
    });
    return {
      jobRunId: jobRun.id,
      batchId: null,
      fetched: 0,
      ok: 0,
      fail: 0,
      total: 0,
      window: { from, to },
      skipped: true,
    };
  }

  // Build adapter config from env. If env is missing, skip safely.
  const token = process.env.SPORTMONKS_API_TOKEN;
  const footballBaseUrl = process.env.SPORTMONKS_FOOTBALL_BASE_URL;
  const coreBaseUrl = process.env.SPORTMONKS_CORE_BASE_URL;
  const authMode =
    (process.env.SPORTMONKS_AUTH_MODE as "query" | "header") || "query";

  if (!token || !footballBaseUrl || !coreBaseUrl) {
    fastify.log.warn(
      "update-prematch-odds: missing SPORTMONKS env vars; skipping"
    );
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
          filters,
          dryRun: !!opts.dryRun,
          reason: "missing-env",
        },
      },
    });
    return {
      jobRunId: jobRun.id,
      batchId: null,
      fetched: 0,
      ok: 0,
      fail: 0,
      total: 0,
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

    let odds: OddsDTO[] = [];
    try {
      odds = await adapter.fetchOddsBetween(from, to, { filters });
    } catch (err: any) {
      fastify.log.error({ err, from, to }, "fetchOddsBetween failed");
      throw err;
    }

    if (!odds.length) {
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
            filters,
            dryRun: !!opts.dryRun,
            fetched: 0,
            reason: "no-odds",
          },
        },
      });
      return {
        jobRunId: jobRun.id,
        batchId: null,
        fetched: 0,
        ok: 0,
        fail: 0,
        total: 0,
        window: { from, to },
        skipped: false,
      };
    }

    // Dry run: report what we would do, but do not write seed batches/items/odds.
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
            filters,
            dryRun: true,
            fetched: odds.length,
          },
        },
      });

      return {
        jobRunId: jobRun.id,
        batchId: null,
        fetched: odds.length,
        ok: 0,
        fail: 0,
        total: 0,
        window: { from, to },
        skipped: false,
      };
    }

    const result = await seedOdds(odds, {
      version: "v1",
      trigger,
      triggeredBy: opts.triggeredBy ? String(opts.triggeredBy) : null,
      triggeredById: opts.triggeredById ?? null,
      dryRun: false,
    });

    await prisma.jobRuns.update({
      where: { id: jobRun.id },
      data: {
        status: RunStatus.success,
        finishedAt: new Date(),
        durationMs: Date.now() - startedAtMs,
        rowsAffected: result?.total ?? odds.length,
        meta: {
          window: { from, to },
          daysAhead,
          filters,
          dryRun: false,
          fetched: odds.length,
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
      fetched: odds.length,
      ok: result?.ok,
      fail: result?.fail,
      total: result?.total,
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
          filters,
          dryRun: !!opts.dryRun,
          ...(opts.meta ?? {}),
        },
      },
    });
    throw err;
  }
}
