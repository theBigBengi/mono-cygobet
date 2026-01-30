import type { FastifyInstance } from "fastify";
import { JobTriggerBy } from "@repo/db";
import type { JobRunOpts } from "../types/jobs";
import {
  finishJobRunFailed,
  finishJobRunSuccess,
  getJobRowOrThrow,
  startJobRun,
} from "./jobs.db";
import { SETTLEMENT_JOB } from "./jobs.definitions";
import { getLogger } from "../logger";
import { repository } from "../services/api/groups/repository";
import { runSettlement } from "../services/settlement/settlement.service";

const log = getLogger("SettlementJob");

export const settlementJob = SETTLEMENT_JOB;

/**
 * Run settlement job: score and close unsettled predictions for finished (FT) fixtures.
 * Idempotent: only unsettled rows are selected; after update they have settledAt set.
 */
export async function runSettlementJob(
  fastify: FastifyInstance,
  opts: JobRunOpts = {}
): Promise<{ jobRunId: number; processed: number; skipped: number }> {
  const jobRow = await getJobRowOrThrow(settlementJob.key);

  const jobRun = await startJobRun({
    jobKey: settlementJob.key,
    trigger:
      opts.trigger ??
      (opts.triggeredBy === JobTriggerBy.cron_scheduler ? "auto" : "manual"),
    triggeredBy: opts.triggeredBy ?? null,
    triggeredById: opts.triggeredById ?? null,
    meta: { ...(opts.meta ?? {}) },
  });
  const startedAtMs = jobRun.startedAtMs;

  try {
    if (!jobRow.enabled && opts.triggeredBy === JobTriggerBy.cron_scheduler) {
      await finishJobRunSuccess({
        id: jobRun.id,
        startedAtMs,
        rowsAffected: 0,
        meta: { reason: "disabled" },
      });
      return { jobRunId: jobRun.id, processed: 0, skipped: 0 };
    }

    const result = await runSettlement(repository);
    const processed = result.processed;
    const skipped = result.skipped;

    await finishJobRunSuccess({
      id: jobRun.id,
      startedAtMs,
      rowsAffected: processed,
      meta: { processed, skipped },
    });

    log.info({ processed, skipped }, "settlement job completed");
    return {
      jobRunId: jobRun.id,
      processed,
      skipped,
    };
  } catch (err: unknown) {
    await finishJobRunFailed({
      id: jobRun.id,
      startedAtMs,
      err,
      rowsAffected: 0,
      meta: {},
    });
    throw err;
  }
}
