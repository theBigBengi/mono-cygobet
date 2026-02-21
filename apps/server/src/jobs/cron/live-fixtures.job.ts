import type { FastifyInstance } from "fastify";
import { RunStatus, prisma } from "@repo/db";
import type { FixtureState } from "@repo/db";
import { NOT_STARTED_STATES, LIVE_STATES, FINISHED_STATES } from "@repo/utils";
import { adapter } from "../../utils/adapter";
import { syncFixtures } from "../../etl/sync/sync.fixtures";
import { finishSeedBatch } from "../../etl/seeds/seed.utils";
import {
  emitFixtureLiveEvents,
  emitFixtureFTEvents,
} from "../../services/api/groups/service/chat-events";
import { settlePredictionsForFixtures } from "../../services/api/groups/service/settlement";
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

      // ── Overdue recovery (Steps 7-11) — always runs ──

      // --- Step 7: Check overdue NS fixtures ---
      const GRACE_SECONDS = 10 * 60; // 10 min grace
      const nowTs = Math.floor(Date.now() / 1000);
      const maxStartTs = nowTs - GRACE_SECONDS;

      // Exclude fixtures already synced in steps 1-4 (by externalId)
      const alreadySyncedIds = new Set(fetchedExternalIds.map(String));

      const overdueCandidates = await prisma.fixtures.findMany({
        where: {
          state: { in: [...NOT_STARTED_STATES] as FixtureState[] },
          startTs: { lt: maxStartTs },
        },
        select: { externalId: true, id: true },
        take: 50,
      });

      const overdueToCheck = overdueCandidates.filter(
        (c) => !alreadySyncedIds.has(String(c.externalId))
      );

      const overdueMeta = {
        candidates: overdueToCheck.length,
        checked: 0,
        recovered: 0,
        settled: 0,
        stillNs: 0,
      };

      if (overdueToCheck.length > 0) {
        // --- Step 8: Fetch overdue fixtures from provider by ID ---
        const overdueExternalIds = overdueToCheck
          .map((c) => Number(c.externalId))
          .filter((n) => Number.isFinite(n));

        const overdueFetched = overdueExternalIds.length > 0
          ? await adapter.fetchFixturesByIds(overdueExternalIds, {
              includeScores: true,
              perPage: 50,
            })
          : [];

        overdueMeta.checked = overdueFetched.length;

        if (overdueFetched.length > 0) {
          // --- Step 9: Sync overdue fixtures to DB ---
          await syncFixtures(overdueFetched, {
            dryRun: false,
            signal: opts.signal,
            batchId: batchId ?? undefined,
            jobRunId,
            bypassStateValidation: true,
          });

          // --- Step 10: Update provider tracking columns ---
          const fetchedOverdueIdSet = new Set(
            overdueFetched.map((f) => String(f.externalId))
          );

          await prisma.$transaction(
            overdueFetched.map((dto) =>
              prisma.fixtures.updateMany({
                where: { externalId: BigInt(dto.externalId) },
                data: {
                  lastProviderCheckAt: new Date(),
                  lastProviderState: dto.state,
                },
              })
            )
          );

          // Mark fixtures NOT returned by provider
          const notReturned = overdueToCheck.filter(
            (c) => !fetchedOverdueIdSet.has(String(c.externalId))
          );
          if (notReturned.length > 0) {
            await prisma.fixtures.updateMany({
              where: { id: { in: notReturned.map((c) => c.id) } },
              data: {
                lastProviderCheckAt: new Date(),
                lastProviderState: null,
              },
            });
          }

          // --- Step 11: Handle state transitions for recovered fixtures ---
          const overdueExtBigints = overdueFetched.map((f) =>
            BigInt(f.externalId)
          );
          const overdueCandidateIds = overdueToCheck.map((c) => c.id);

          // NS → LIVE
          const nowLiveOverdue = await prisma.fixtures.findMany({
            where: {
              externalId: { in: overdueExtBigints },
              id: { in: overdueCandidateIds },
              state: { in: [...LIVE_STATES] as FixtureState[] },
            },
            select: {
              id: true,
              homeTeam: { select: { name: true } },
              awayTeam: { select: { name: true } },
            },
          });

          if (nowLiveOverdue.length > 0) {
            try {
              await emitFixtureLiveEvents(
                nowLiveOverdue as {
                  id: number;
                  homeTeam: { name: string } | null;
                  awayTeam: { name: string } | null;
                }[],
                fastify.io
              );
            } catch (err) {
              log.error(
                { err, count: nowLiveOverdue.length },
                "Failed to emit fixture_live events for overdue fixtures"
              );
            }
          }

          // NS → FT/AET/FT_PEN: settle predictions + emit FT events
          const ftOverdue = await prisma.fixtures.findMany({
            where: {
              externalId: { in: overdueExtBigints },
              id: { in: overdueCandidateIds },
              state: { in: [...FINISHED_STATES] as FixtureState[] },
            },
            select: { id: true },
          });

          if (ftOverdue.length > 0) {
            const settlement = await settlePredictionsForFixtures(
              ftOverdue.map((f) => f.id),
              fastify.io
            );
            overdueMeta.settled = settlement.settled;

            const ftOverdueWithTeams = await prisma.fixtures.findMany({
              where: { id: { in: ftOverdue.map((f) => f.id) } },
              select: {
                id: true,
                homeScore90: true,
                awayScore90: true,
                homeTeam: { select: { name: true } },
                awayTeam: { select: { name: true } },
              },
            });
            await emitFixtureFTEvents(ftOverdueWithTeams, fastify.io);
          }

          overdueMeta.recovered = nowLiveOverdue.length + ftOverdue.length;

          // Count how many provider still shows NS
          const stillNsCount = overdueFetched.filter(
            (dto) => NOT_STARTED_STATES.has(dto.state)
          ).length;
          overdueMeta.stillNs = stillNsCount;
        } else {
          // No fixtures returned by provider — mark all as checked
          await prisma.fixtures.updateMany({
            where: { id: { in: overdueToCheck.map((c) => c.id) } },
            data: {
              lastProviderCheckAt: new Date(),
              lastProviderState: null,
            },
          });
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
          overdue: overdueMeta,
          ...(opts.meta ?? {}),
        },
      };
    },
  });
}
