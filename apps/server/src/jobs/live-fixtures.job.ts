import type { FastifyInstance } from "fastify";
import { RunStatus, prisma } from "@repo/db";
import type { FixtureState } from "@repo/db";
import { NOT_STARTED_STATES, LIVE_STATES, FINISHED_STATES } from "@repo/utils";
import { adapter } from "../utils/adapter";
import { syncFixtures } from "../etl/sync/sync.fixtures";
import { finishSeedBatch } from "../etl/seeds/seed.utils";
import {
  emitFixtureLiveEvents,
  emitFixtureFTEvents,
} from "../services/api/groups/service/chat-events";
import { settlePredictionsForFixtures } from "../services/api/groups/service/settlement";
import type { JobRunOpts, StandardJobRunStats } from "../types/jobs";
import { LIVE_FIXTURES_JOB } from "./jobs.definitions";
import { createBatchForJob } from "./jobs.db";
import { runJob } from "./run-job";

/**
 * live-fixtures job
 * ----------------
 * Goal: Keep our DB updated with fixtures that are currently in-play (LIVE/HT/etc.)
 *
 * What it does:
 * - Fetch live fixtures from sports-data provider (livescores/inplay endpoint)
 * - Upsert them into our DB using the existing fixtures seeder (Prisma upsert)
 * - Track execution in `job_runs`
 *
 * Notes:
 * - This job is gated by the `jobs` DB table (jobs.enabled).
 * - Use `dryRun` to measure impact without DB writes.
 */
export const liveFixturesJob = LIVE_FIXTURES_JOB;

export async function runLiveFixturesJob(
  fastify: FastifyInstance,
  opts: JobRunOpts = {}
): Promise<StandardJobRunStats> {
  return runJob<StandardJobRunStats>({
    jobKey: liveFixturesJob.key,
    loggerName: "LiveFixturesJob",
    opts,
    skippedResult: (jobRunId) => ({
      jobRunId,
      fetched: 0,
      total: 0,
      ok: 0,
      fail: 0,
      batchId: null,
      skipped: true,
    }),
    run: async ({ jobRunId }) => {
      // SportMonks state IDs for LIVE states only:
      // 2=INPLAY_1ST_HALF, 3=HT, 4=BREAK, 6=INPLAY_ET,
      // 9=INPLAY_PENALTIES, 21=EXTRA_TIME_BREAK, 22=INPLAY_2ND_HALF, 25=PEN_BREAK
      const LIVE_STATE_IDS = "2,3,4,6,9,21,22,25";

      const fixtures = await adapter.fetchLiveFixtures({
        includeScores: true,
        filters: { fixtureStates: LIVE_STATE_IDS },
      });

      if (opts.dryRun) {
        return {
          result: {
            jobRunId,
            fetched: fixtures.length,
            total: 0,
            ok: 0,
            fail: 0,
            batchId: null,
            skipped: false,
          },
          rowsAffected: 0,
          meta: {
            dryRun: true,
            fetched: fixtures.length,
            ...(opts.meta ?? {}),
          },
        };
      }

      let batchId: number | null = null;
      try {
        const batch = await createBatchForJob(liveFixturesJob.key, jobRunId);
        batchId = batch.id;

        const fetchedExternalIds = fixtures.map((f) => BigInt(f.externalId));
        // Snapshot NS and LIVE fixtures before sync (parallel — independent queries)
        const [preStates, preLive] =
          fetchedExternalIds.length > 0
            ? await Promise.all([
                prisma.fixtures.findMany({
                  where: {
                    id: { gte: 0 },
                    externalId: { in: fetchedExternalIds },
                    state: { in: [...NOT_STARTED_STATES] as FixtureState[] },
                  },
                  select: { id: true, externalId: true },
                }),
                prisma.fixtures.findMany({
                  where: {
                    id: { gte: 0 },
                    externalId: { in: fetchedExternalIds },
                    state: { in: [...LIVE_STATES] as FixtureState[] },
                  },
                  select: { id: true, externalId: true },
                }),
              ])
            : [[], [] as { id: number; externalId: bigint }[]];
        const nsFixtureIds = new Set(preStates.map((f) => f.id));
        const liveFixtureIds = new Set(preLive.map((f) => f.id));

        const result = await syncFixtures(fixtures, {
          dryRun: false,
          signal: opts.signal,
          batchId,
        });

        const ok = result.inserted + result.updated;
        await finishSeedBatch(batchId, RunStatus.success, {
          itemsTotal: result.total,
          itemsSuccess: ok + result.skipped,
          itemsFailed: result.failed,
          meta: {
            fetched: fixtures.length,
            inserted: result.inserted,
            updated: result.updated,
            skipped: result.skipped,
            failed: result.failed,
          },
        });

        // Emit fixture_live chat events for fixtures that transitioned NS → LIVE
        if (nsFixtureIds.size > 0) {
          const nowLive = await prisma.fixtures.findMany({
            where: {
              id: { in: Array.from(nsFixtureIds) },
              state: { in: [...LIVE_STATES] as FixtureState[] },
            },
            select: {
              id: true,
              homeTeam: { select: { name: true } },
              awayTeam: { select: { name: true } },
            },
          });

          if (nowLive.length > 0) {
            await emitFixtureLiveEvents(
              nowLive as {
                id: number;
                homeTeam: { name: string } | null;
                awayTeam: { name: string } | null;
              }[],
              fastify.io
            );
          }
        }

        let finishedTransitionCount = 0;
        // Detect LIVE → FINISHED transitions and trigger settlement
        if (liveFixtureIds.size > 0) {
          const nowFinished = await prisma.fixtures.findMany({
            where: {
              id: { in: Array.from(liveFixtureIds) },
              state: { in: [...FINISHED_STATES] as FixtureState[] },
            },
            select: {
              id: true,
              homeScore: true,
              awayScore: true,
              homeTeam: { select: { name: true } },
              awayTeam: { select: { name: true } },
            },
          });

          if (nowFinished.length > 0) {
            await settlePredictionsForFixtures(
              nowFinished.map((f) => f.id),
              fastify.io
            );
            await emitFixtureFTEvents(nowFinished, fastify.io);
            finishedTransitionCount = nowFinished.length;
          }
        }

        return {
          result: {
            jobRunId,
            fetched: fixtures.length,
            batchId,
            total: result.total,
            ok,
            fail: result.failed,
            skipped: false,
          },
          rowsAffected: result.total,
          meta: {
            batchId,
            fetched: fixtures.length,
            ok,
            fail: result.failed,
            total: result.total,
            inserted: result.inserted,
            updated: result.updated,
            skipped: result.skipped,
            finishedTransitions: finishedTransitionCount,
            ...(opts.meta ?? {}),
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
