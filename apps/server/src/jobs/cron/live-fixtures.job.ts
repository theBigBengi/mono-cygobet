import type { FastifyInstance } from "fastify";
import { RunStatus, prisma } from "@repo/db";
import type { FixtureState } from "@repo/db";
import { NOT_STARTED_STATES, LIVE_STATES } from "@repo/utils";
import { adapter } from "../../utils/adapter";
import { syncFixtures } from "../../etl/sync/sync.fixtures";
import { finishSeedBatch } from "../../etl/seeds/seed.utils";
import { emitFixtureLiveEvents } from "../../services/api/groups/service/chat-events";
import type { JobRunOpts, StandardJobRunStats } from "../../types/jobs";
import { LIVE_FIXTURES_JOB } from "../jobs.definitions";
import { createBatchForJob } from "../jobs.db";
import { runJob } from "../run-job";

/**
 * live-fixtures job
 * ----------------
 * Goal: Keep our DB updated with fixtures that are currently in-play (LIVE/HT/etc.)
 *
 * What it does:
 * - Fetch live fixtures from sports-data provider (livescores/inplay endpoint)
 * - Upsert them into our DB using the existing fixtures seeder (Prisma upsert)
 * - Emit NS→LIVE chat events
 * - Track execution in `job_runs`
 *
 * Notes:
 * - This job is gated by the `jobs` DB table (jobs.enabled).
 * - Use `dryRun` to measure impact without DB writes.
 * - Overdue NS fixture recovery is handled by the recovery-overdue-fixtures job.
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
    run: async ({ jobRunId, log }) => {
      // --- Step 1: Fetch live fixtures from sports-data provider ---
      // SportMonks state IDs for LIVE states only:
      // 2=INPLAY_1ST_HALF, 3=HT, 4=BREAK, 6=INPLAY_ET,
      // 9=INPLAY_PENALTIES, 21=EXTRA_TIME_BREAK, 22=INPLAY_2ND_HALF, 25=PEN_BREAK
      const LIVE_STATE_IDS = "2,3,4,6,9,21,22,25";

      const fixtures = await adapter.fetchLiveFixtures({
        includeScores: true,
        filters: { fixtureStates: LIVE_STATE_IDS },
      });

      // Early exit: dryRun mode skips DB writes and returns fetch stats only
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

      // ── Live fixtures sync (Steps 2-6) ──
      let batchId: number | null = null;
      let fetchedExternalIds: bigint[] = [];
      let liveSyncMeta = {
        fetched: fixtures.length,
        ok: 0,
        fail: 0,
        total: 0,
        inserted: 0,
        updated: 0,
        skipped: 0,
      };

      if (fixtures.length > 0) {
        try {
          // --- Step 2: Create a batch record for this job run ---
          const batch = await createBatchForJob(liveFixturesJob.key, jobRunId);
          batchId = batch.id;

          // --- Step 3: Snapshot fixtures that are NOT_STARTED before sync ---
          fetchedExternalIds = fixtures
            .map((f) => {
              try {
                return BigInt(f.externalId);
              } catch {
                return null;
              }
            })
            .filter((id): id is bigint => id !== null);
          const preStates =
            fetchedExternalIds.length > 0
              ? await prisma.fixtures.findMany({
                  where: {
                    externalId: { in: fetchedExternalIds },
                    state: { in: [...NOT_STARTED_STATES] as FixtureState[] },
                  },
                  select: { id: true, externalId: true },
                })
              : [];
          const nsFixtureIds = new Set(preStates.map((f) => f.id));

          // --- Step 4: Sync fetched fixtures into DB (upsert) ---
          const result = await syncFixtures(fixtures, {
            dryRun: false,
            signal: opts.signal,
            batchId,
            jobRunId,
          });

          const ok = result.inserted + result.updated;
          liveSyncMeta = {
            fetched: fixtures.length,
            ok,
            fail: result.failed,
            total: result.total,
            inserted: result.inserted,
            updated: result.updated,
            skipped: result.skipped,
          };

          // --- Step 5: Mark batch as completed and record stats ---
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

          // --- Step 5b: Update provider tracking for all live fixtures ---
          if (fixtures.length > 0) {
            await prisma.$transaction(
              fixtures.map((dto) =>
                prisma.fixtures.updateMany({
                  where: { externalId: BigInt(dto.externalId) },
                  data: {
                    lastProviderCheckAt: new Date(),
                    lastProviderState: dto.state,
                  },
                })
              )
            );
          }

          // --- Step 6: Emit fixture_live chat events for fixtures that transitioned NS → LIVE ---
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
          }
        } catch (err) {
          if (batchId != null) {
            await finishSeedBatch(batchId, RunStatus.failed, {
              errorMessage: err instanceof Error ? err.message : String(err),
            });
          }
          throw err;
        }
      }

      return {
        result: {
          jobRunId,
          fetched: fixtures.length,
          batchId,
          total: liveSyncMeta.total,
          ok: liveSyncMeta.ok,
          fail: liveSyncMeta.fail,
          skipped: false,
        },
        rowsAffected: liveSyncMeta.total,
        meta: {
          batchId,
          ...liveSyncMeta,
          ...(opts.meta ?? {}),
        },
      };
    },
  });
}
