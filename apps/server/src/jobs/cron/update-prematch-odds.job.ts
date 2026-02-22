import type { FastifyInstance } from "fastify";
import { addDays, format } from "date-fns";
import { RunStatus } from "@repo/db";
import { adapter } from "../../utils/adapter";
import type { OddsDTO } from "@repo/types/sport-data/common";
import type { JobRunOpts, StandardJobRunStats } from "../../types/jobs";
import { syncOdds } from "../../etl/sync/sync.odds";
import { finishSeedBatch } from "../../etl/seeds/seed.utils";
import { UPDATE_PREMATCH_ODDS_JOB } from "../jobs.definitions";
import { createBatchForJob, getJobRowOrThrow } from "../jobs.db";
import { getMeta } from "../jobs.meta";
import { UpdatePrematchOddsJobMeta } from "@repo/types";
import { runJob } from "../run-job";
import type { OddsFetchOptions } from "@repo/sports-data";

/**
 * update-prematch-odds job
 * -----------------------
 * Ported from groups-server `PrematchOddsWindowJob`.
 *
 * Fetches prematch odds for a rolling window (today -> today+daysAhead)
 * and upserts them into DB via `syncOdds`.
 *
 * What controls this job:
 * - `jobs.enabled`: whether cron triggers should execute (manual runs still execute)
 * - `jobs.meta.odds.bookmakerExternalIds`: which bookmakers to request from provider
 * - `jobs.meta.odds.marketExternalIds`: which markets to request from provider
 */
export const updatePrematchOddsJob = UPDATE_PREMATCH_ODDS_JOB;

const DEFAULT_DAYS_AHEAD = UPDATE_PREMATCH_ODDS_JOB.meta?.daysAhead ?? 7;

export async function runUpdatePrematchOddsJob(
  fastify: FastifyInstance,
  opts: JobRunOpts & { daysAhead?: number } = {}
): Promise<
  StandardJobRunStats & {
    window: { from: string; to: string };
    inserted?: number;
    updated?: number;
    skippedCount?: number;
    failed?: number;
  }
> {
  const jobRow = await getJobRowOrThrow(updatePrematchOddsJob.key);
  const meta = getMeta<UpdatePrematchOddsJobMeta>(jobRow.meta);
  const bookmakerExternalIds = meta.odds.bookmakerExternalIds;
  const marketExternalIds = meta.odds.marketExternalIds;
  const daysAhead = opts.daysAhead ?? meta.daysAhead ?? DEFAULT_DAYS_AHEAD;
  const oddsOpts: OddsFetchOptions = {
    bookmakerIds: bookmakerExternalIds.map(String),
    marketIds: marketExternalIds.map(String),
  };
  const from = format(new Date(), "yyyy-MM-dd");
  const to = format(addDays(new Date(), daysAhead), "yyyy-MM-dd");

  type UpdatePrematchOddsResult = StandardJobRunStats & {
    window: { from: string; to: string };
    inserted?: number;
    updated?: number;
    skippedCount?: number;
    failed?: number;
  };

  return runJob<UpdatePrematchOddsResult>({
    jobKey: updatePrematchOddsJob.key,
    loggerName: "UpdatePrematchOddsJob",
    opts,
    jobRow,
    meta: {
      daysAhead,
      bookmakerExternalIds,
      marketExternalIds,
      window: { from, to },
    },
    skippedResult: (jobRunId) => ({
      jobRunId,
      fetched: 0,
      total: 0,
      window: { from, to },
      skipped: true,
    }),
    run: async ({ jobRunId, log }) => {
      let odds: OddsDTO[] = [];
      try {
        odds = await adapter.fetchOddsBetween(from, to, oddsOpts);
      } catch (err: unknown) {
        log.error({ err, from, to }, "fetchOddsBetween failed");
        throw err;
      }

      if (!odds.length) {
        return {
          result: {
            jobRunId,
            fetched: 0,
            total: 0,
            window: { from, to },
            skipped: false,
          },
          rowsAffected: 0,
          meta: {
            window: { from, to },
            daysAhead,
            dryRun: !!opts.dryRun,
            fetched: 0,
            reason: "no-odds",
          },
        };
      }

      if (opts.dryRun) {
        return {
          result: {
            jobRunId,
            fetched: odds.length,
            total: 0,
            window: { from, to },
            skipped: false,
          },
          rowsAffected: 0,
          meta: {
            window: { from, to },
            daysAhead,
            dryRun: true,
            fetched: odds.length,
          },
        };
      }

      let batchId: number | null = null;
      try {
        const batch = await createBatchForJob(updatePrematchOddsJob.key, jobRunId);
        batchId = batch.id;

        const result = await syncOdds(odds, {
          signal: opts.signal,
          batchId,
        });
        const ok = result.inserted + result.updated;

        await finishSeedBatch(batchId, RunStatus.success, {
          itemsTotal: result.total,
          itemsSuccess: ok + result.skipped,
          itemsFailed: result.failed,
          meta: {
            window: { from, to },
            inserted: result.inserted,
            updated: result.updated,
            skipped: result.skipped,
            failed: result.failed,
          },
        });

        return {
          result: {
            jobRunId,
            fetched: odds.length,
            total: result.total,
            inserted: result.inserted,
            updated: result.updated,
            skippedCount: result.skipped,
            failed: result.failed,
            window: { from, to },
            skipped: false,
          },
          rowsAffected: result.total,
          meta: {
            batchId,
            window: { from, to },
            daysAhead,
            dryRun: false,
            fetched: odds.length,
            inserted: result.inserted,
            updated: result.updated,
            skipped: result.skipped,
            failed: result.failed,
            total: result.total,
          },
        };
      } catch (err) {
        if (batchId != null) {
          await finishSeedBatch(batchId, RunStatus.failed, {
            errorMessage: err instanceof Error ? err.message : String(err),
          });
        }
        throw err;
      }
    },
  });
}
