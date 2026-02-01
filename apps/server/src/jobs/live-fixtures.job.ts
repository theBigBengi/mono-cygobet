import type { FastifyInstance } from "fastify";
import { RunStatus, prisma } from "@repo/db";
import type { FixtureState } from "@repo/db";
import { NOT_STARTED_STATES, LIVE_STATES } from "@repo/utils";
import { adapter } from "../utils/adapter";
import { syncFixtures } from "../etl/sync/sync.fixtures";
import { finishSeedBatch } from "../etl/seeds/seed.utils";
import { emitFixtureLiveEvents } from "../services/api/groups/service/chat-events";
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
      const fixtures = await adapter.fetchLiveFixtures({
        includeScores: true,
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

        // Snapshot NS fixtures before sync to detect NS → LIVE transitions
        const fetchedExternalIds = fixtures.map((f) => BigInt(f.externalId));
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
              nowLive as { id: number; homeTeam: { name: string } | null; awayTeam: { name: string } | null }[],
              fastify.io
            );
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
