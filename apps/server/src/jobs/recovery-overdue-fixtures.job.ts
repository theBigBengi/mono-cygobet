/**
 * recovery-overdue-fixtures job
 * -----------------------------
 * Goal: Fix fixtures stuck in NS state after their start time has passed.
 *
 * When this happens:
 * - Server was down during match
 * - live-fixtures job missed the NS→LIVE transition
 * - Match finished while we still show NS
 *
 * Flow:
 * 1. Find fixtures: state=NS, startTs < now - graceMinutes, startTs > now - maxOverdueHours
 * 2. Fetch current state from provider by externalId (no state filter)
 * 3. Sync to DB (updates state, scores)
 * 4. If finished (FT/AET/FT_PEN) → settle predictions
 * 5. Emit appropriate chat events (live/ft)
 */

import type { FastifyInstance } from "fastify";
import { NOT_STARTED_STATES, LIVE_STATES, FINISHED_STATES } from "@repo/utils";
import { adapter } from "../utils/adapter";
import { RunStatus, prisma } from "@repo/db";
import type { FixtureState } from "@repo/db";
import { syncFixtures } from "../etl/sync/sync.fixtures";
import { finishSeedBatch } from "../etl/seeds/seed.utils";
import { chunk } from "../etl/utils";
import { JobRunOpts } from "../types/jobs";
import { settlePredictionsForFixtures } from "../services/api/groups/service/settlement";
import {
  emitFixtureLiveEvents,
  emitFixtureFTEvents,
} from "../services/api/groups/service/chat-events";
import { RECOVERY_OVERDUE_FIXTURES_JOB } from "./jobs.definitions";
import { createBatchForJob, getJobRowOrThrow } from "./jobs.db";
import {
  clampInt,
  getMeta,
  isRecoveryOverdueFixturesJobMeta,
} from "./jobs.meta";
import { runJob } from "./run-job";

export const recoveryOverdueFixturesJob = RECOVERY_OVERDUE_FIXTURES_JOB;

const DEFAULT_GRACE_MINUTES = 30;
const DEFAULT_MAX_OVERDUE_HOURS = 48;

export async function runRecoveryOverdueFixturesJob(
  fastify: FastifyInstance,
  opts: JobRunOpts = {}
) {
  const jobRow = await getJobRowOrThrow(recoveryOverdueFixturesJob.key);
  const meta = getMeta<{
    graceMinutes?: number;
    maxOverdueHours?: number;
  }>(jobRow.meta);

  const graceMinutes = clampInt(
    isRecoveryOverdueFixturesJobMeta(meta)
      ? (meta.graceMinutes ?? DEFAULT_GRACE_MINUTES)
      : DEFAULT_GRACE_MINUTES,
    1,
    120
  );

  const maxOverdueHours = clampInt(
    isRecoveryOverdueFixturesJobMeta(meta)
      ? (meta.maxOverdueHours ?? DEFAULT_MAX_OVERDUE_HOURS)
      : DEFAULT_MAX_OVERDUE_HOURS,
    1,
    168
  );

  return runJob({
    jobKey: recoveryOverdueFixturesJob.key,
    loggerName: "RecoveryOverdueFixturesJob",
    opts,
    jobRow,
    meta: { graceMinutes, maxOverdueHours },
    skippedResult: () => ({
      candidates: 0,
      fetched: 0,
      updated: 0,
      settled: 0,
      skipped: true,
    }),
    run: async ({ jobRunId, log }) => {
      const now = Math.floor(Date.now() / 1000);
      const graceSeconds = graceMinutes * 60;
      const maxOverdueSeconds = maxOverdueHours * 60 * 60;

      // startTs < now - graceMinutes  (fixture started more than grace ago)
      const maxStartTs = now - graceSeconds;
      // startTs > now - maxOverdueHours  (fixture not too old)
      const minStartTs = now - maxOverdueSeconds;

      const candidates = await prisma.fixtures.findMany({
        where: {
          state: { in: [...NOT_STARTED_STATES] as FixtureState[] },
          startTs: { lt: maxStartTs, gt: minStartTs },
        },
        select: { externalId: true, id: true },
      });

      if (!candidates.length) {
        return {
          result: {
            jobRunId,
            candidates: 0,
            fetched: 0,
            updated: 0,
            settled: 0,
            skipped: false,
          },
          rowsAffected: 0,
          meta: {
            graceMinutes,
            maxOverdueHours,
            dryRun: !!opts.dryRun,
            reason: "no-candidates",
          },
        };
      }

      const ids = candidates
        .map((c) => Number(c.externalId))
        .filter((n) => Number.isFinite(n));

      if (!ids.length) {
        return {
          result: {
            jobRunId,
            candidates: candidates.length,
            fetched: 0,
            updated: 0,
            settled: 0,
            skipped: false,
          },
          rowsAffected: 0,
          meta: {
            graceMinutes,
            maxOverdueHours,
            dryRun: !!opts.dryRun,
            reason: "no-valid-external-ids",
            candidates: candidates.length,
          },
        };
      }

      let fetched: Awaited<ReturnType<typeof adapter.fetchFixturesByIds>> = [];
      for (const group of chunk(ids, 50)) {
        if (opts.signal?.aborted) {
          log.warn("recovery-overdue-fixtures fetch aborted by signal");
          break;
        }
        const part = await adapter.fetchFixturesByIds(group, {
          includeScores: true,
          perPage: 50,
        });
        if (part?.length) fetched = fetched.concat(part);
      }

      if (!fetched.length) {
        return {
          result: {
            jobRunId,
            candidates: candidates.length,
            fetched: 0,
            updated: 0,
            settled: 0,
            skipped: false,
          },
          rowsAffected: 0,
          meta: {
            graceMinutes,
            maxOverdueHours,
            dryRun: !!opts.dryRun,
            reason: "no-fixtures-from-provider",
            candidates: candidates.length,
          },
        };
      }

      if (opts.dryRun) {
        return {
          result: {
            jobRunId,
            candidates: candidates.length,
            fetched: fetched.length,
            updated: 0,
            settled: 0,
            skipped: false,
          },
          rowsAffected: 0,
          meta: {
            graceMinutes,
            maxOverdueHours,
            dryRun: true,
            candidates: candidates.length,
            fetched: fetched.length,
          },
        };
      }

      let batchId: number | null = null;
      try {
        const batch = await createBatchForJob(
          recoveryOverdueFixturesJob.key,
          jobRunId
        );
        batchId = batch.id;

        const result = await syncFixtures(fetched, {
          dryRun: false,
          signal: opts.signal,
          batchId,
          jobRunId,
        });

        const updated = result.updated;
        const ok = result.inserted + result.updated;

        await finishSeedBatch(batchId, RunStatus.success, {
          itemsTotal: result.total,
          itemsSuccess: ok + result.skipped,
          itemsFailed: result.failed,
          meta: {
            candidates: candidates.length,
            fetched: fetched.length,
            inserted: result.inserted,
            updated: result.updated,
            skipped: result.skipped,
            failed: result.failed,
          },
        });

        const fetchedExternalIds = fetched.map((f) => BigInt(f.externalId));

        // Find fixtures that transitioned NS → LIVE
        const nowLive = await prisma.fixtures.findMany({
          where: {
            externalId: { in: fetchedExternalIds },
            id: { in: candidates.map((c) => c.id) },
            state: { in: [...LIVE_STATES] as FixtureState[] },
          },
          select: {
            id: true,
            homeTeam: { select: { name: true } },
            awayTeam: { select: { name: true } },
          },
        });

        if (nowLive.length > 0) {
          try {
            await emitFixtureLiveEvents(
              nowLive as {
                id: number;
                homeTeam: { name: string } | null;
                awayTeam: { name: string } | null;
              }[],
              fastify.io
            );
          } catch (err) {
            log.error(
              { err, count: nowLive.length },
              "Failed to emit fixture_live events"
            );
          }
        }

        // Find fixtures that transitioned NS → FT and settle + emit FT events
        const ftFixtures = await prisma.fixtures.findMany({
          where: {
            externalId: { in: fetchedExternalIds },
            id: { in: candidates.map((c) => c.id) },
            state: { in: [...FINISHED_STATES] as FixtureState[] },
          },
          select: { id: true },
        });

        let settled = 0;
        if (ftFixtures.length > 0) {
          const settlement = await settlePredictionsForFixtures(
            ftFixtures.map((f) => f.id),
            fastify.io
          );
          settled = settlement.settled;

          const ftFixturesWithTeams = await prisma.fixtures.findMany({
            where: { id: { in: ftFixtures.map((f) => f.id) } },
            select: {
              id: true,
              homeScore90: true,
              awayScore90: true,
              homeTeam: { select: { name: true } },
              awayTeam: { select: { name: true } },
            },
          });
          await emitFixtureFTEvents(ftFixturesWithTeams, fastify.io);
        }

        return {
          result: {
            jobRunId,
            candidates: candidates.length,
            fetched: fetched.length,
            updated,
            settled,
            skipped: false,
          },
          rowsAffected: result.total,
          meta: {
            batchId,
            graceMinutes,
            maxOverdueHours,
            dryRun: false,
            candidates: candidates.length,
            fetched: fetched.length,
            updated,
            settled,
            inserted: result.inserted,
            skipped: result.skipped,
            failed: result.failed,
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
