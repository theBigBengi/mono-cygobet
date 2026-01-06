import type { FastifyInstance } from "fastify";
import { addDays, format } from "date-fns";
import { SportMonksAdapter } from "@repo/sports-data/adapters/sportmonks";
import type { OddsDTO } from "@repo/types/sport-data/common";
import { JobTriggerBy, RunTrigger } from "@repo/db";

import type { JobRunOpts, StandardJobRunStats } from "../types/jobs";
import { seedOdds } from "../etl/seeds/seed.odds";
import { UPDATE_PREMATCH_ODDS_JOB } from "./jobs.definitions";
import {
  finishJobRunFailed,
  finishJobRunSkipped,
  finishJobRunSuccess,
  getJobRowOrThrow,
  startJobRun,
} from "./jobs.db";
import { getMeta, isUpdatePrematchOddsJobMeta } from "./jobs.meta";
import { UpdatePrematchOddsJobMeta } from "@repo/types";

/**
 * update-prematch-odds job
 * -----------------------
 * Ported from groups-server `PrematchOddsWindowJob`.
 *
 * Fetches prematch odds for a rolling window (today -> today+daysAhead)
 * and upserts them into DB via `seedOdds`.
 *
 * What controls this job:
 * - `jobs.enabled`: whether cron triggers should execute (manual runs still execute)
 * - `jobs.meta.odds.bookmakerExternalIds`: which bookmakers to request from SportMonks
 * - `jobs.meta.odds.marketExternalIds`: which markets to request from SportMonks
 */
export const updatePrematchOddsJob = UPDATE_PREMATCH_ODDS_JOB;

const DEFAULT_DAYS_AHEAD = UPDATE_PREMATCH_ODDS_JOB.meta?.daysAhead ?? 7;

/**
 * runUpdatePrematchOddsJob()
 * -------------------------
 * Entry point for scheduler/admin to execute the prematch odds job.
 *
 * Flow:
 * 1) Load job config from DB (must exist; jobs are seeded).
 * 2) Validate `jobs.meta` has the canonical odds config (no guessing).
 * 3) Build SportMonks filters string from meta (or allow explicit override via opts.filters).
 * 4) Create job_runs record.
 * 5) Skip if disabled + cron trigger.
 * 6) Fetch odds from provider, seed into DB, update run record with counts.
 */
export async function runUpdatePrematchOddsJob(
  fastify: FastifyInstance,
  opts: JobRunOpts & { daysAhead?: number; filters?: string } = {}
): Promise<
  StandardJobRunStats & {
    window: { from: string; to: string };
  }
> {
  // Jobs are seeded in DB. Missing row is a deployment/config error.
  const jobRow = await getJobRowOrThrow(updatePrematchOddsJob.key);

  const meta = getMeta<UpdatePrematchOddsJobMeta>(jobRow.meta);

  const bookmakerExternalIds = meta.odds.bookmakerExternalIds;
  const marketExternalIds = meta.odds.marketExternalIds;
  const daysAhead = opts.daysAhead ?? meta.daysAhead ?? DEFAULT_DAYS_AHEAD;

  // SportMonks expects a semicolon-delimited filters string.
  // Example: "bookmakers:2;markets:1,57;"
  const filtersFromMeta = `bookmakers:${bookmakerExternalIds.join(
    ","
  )};markets:${marketExternalIds.join(",")};`;

  // Allow explicit runtime override (tests/CLI); otherwise use canonical DB meta.
  const filters = opts.filters ?? filtersFromMeta;

  // Disabled should only prevent cron runs. Manual "Run" should still work.
  const isCronTrigger = opts.triggeredBy === JobTriggerBy.cron_scheduler;

  const trigger =
    opts.trigger ??
    (opts.triggeredBy === JobTriggerBy.cron_scheduler
      ? RunTrigger.auto
      : RunTrigger.manual);

  const jobRun = await startJobRun({
    jobKey: updatePrematchOddsJob.key,
    trigger,
    triggeredBy: opts.triggeredBy ?? null,
    triggeredById: opts.triggeredById ?? null,
    meta: {
      daysAhead,
      filters,
      bookmakerExternalIds,
      marketExternalIds,
      dryRun: !!opts.dryRun,
      ...(opts.meta ?? {}),
    },
  });
  const startedAtMs = jobRun.startedAtMs;

  const from = format(new Date(), "yyyy-MM-dd");
  const to = format(addDays(new Date(), daysAhead), "yyyy-MM-dd");

  if (!jobRow.enabled && isCronTrigger) {
    await finishJobRunSkipped({
      id: jobRun.id,
      startedAtMs,
      rowsAffected: 0,
      meta: {
        window: { from, to },
        daysAhead,
        filters,
        dryRun: !!opts.dryRun,
        reason: "disabled",
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
    await finishJobRunSkipped({
      id: jobRun.id,
      startedAtMs,
      rowsAffected: 0,
      meta: {
        window: { from, to },
        daysAhead,
        filters,
        dryRun: !!opts.dryRun,
        reason: "missing-env",
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
      await finishJobRunSuccess({
        id: jobRun.id,
        startedAtMs,
        rowsAffected: 0,
        meta: {
          window: { from, to },
          daysAhead,
          filters,
          dryRun: !!opts.dryRun,
          fetched: 0,
          reason: "no-odds",
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
      await finishJobRunSuccess({
        id: jobRun.id,
        startedAtMs,
        rowsAffected: 0,
        meta: {
          window: { from, to },
          daysAhead,
          filters,
          dryRun: true,
          fetched: odds.length,
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

    await finishJobRunSuccess({
      id: jobRun.id,
      startedAtMs,
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
        inserted: result?.inserted ?? 0,
        updated: result?.updated ?? 0,
        skipped: result?.skipped ?? 0,
        duplicates: result?.duplicates ?? 0,
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
  } catch (err: unknown) {
    await finishJobRunFailed({
      id: jobRun.id,
      startedAtMs,
      err,
      rowsAffected: 0,
      meta: {
        window: { from, to },
        daysAhead,
        filters,
        dryRun: !!opts.dryRun,
        ...(opts.meta ?? {}),
      },
    });
    throw err;
  }
}
