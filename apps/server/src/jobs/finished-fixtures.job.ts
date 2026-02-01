import type { FastifyInstance } from "fastify";
import { LIVE_STATES, FINISHED_STATES } from "@repo/utils";
import { adapter } from "../utils/adapter";
import { prisma } from "@repo/db";
import type { FixtureState } from "@repo/db";
import { syncFixtures } from "../etl/sync/sync.fixtures";
import { chunk } from "../etl/utils";
import { JobRunOpts } from "../types/jobs";
import { FINISHED_FIXTURES_JOB } from "./jobs.definitions";
import { getJobRowOrThrow } from "./jobs.db";
import { clampInt, getMeta, isFinishedFixturesJobMeta } from "./jobs.meta";
import { runJob } from "./run-job";
import { settlePredictionsForFixtures } from "../services/api/groups/service/settlement";
import { emitFixtureFTEvents } from "../services/api/groups/service/chat-events";

/**
 * finished-fixtures job
 * --------------------
 * Goal: keep our DB fixtures in sync when matches finish.
 *
 * Flow: find LIVE fixtures that are too old, re-fetch from provider (FT only),
 * then sync via syncFixtures (same transform + state validation + persist as other jobs).
 */
export const finishedFixturesJob = FINISHED_FIXTURES_JOB;

const DEFAULT_MAX_LIVE_AGE_HOURS =
  FINISHED_FIXTURES_JOB.meta?.maxLiveAgeHours ?? 2;

export async function runFinishedFixturesJob(
  fastify: FastifyInstance,
  opts: JobRunOpts & { maxLiveAgeHours?: number } = { maxLiveAgeHours: 2 }
) {
  const jobRow = await getJobRowOrThrow(finishedFixturesJob.key);
  const meta = getMeta<{ maxLiveAgeHours?: number }>(jobRow.meta);
  const maxLiveAgeHours = clampInt(
    opts.maxLiveAgeHours ??
      (isFinishedFixturesJobMeta(meta)
        ? meta.maxLiveAgeHours
        : DEFAULT_MAX_LIVE_AGE_HOURS) ??
      DEFAULT_MAX_LIVE_AGE_HOURS,
    1,
    168
  );

  return runJob({
    jobKey: finishedFixturesJob.key,
    loggerName: "FinishedFixturesJob",
    opts,
    jobRow,
    meta: { maxLiveAgeHours },
    skippedResult: () => ({
      candidates: 0,
      fetched: 0,
      updated: 0,
      skipped: true,
    }),
    run: async ({ jobRunId, log }) => {
      const cutoffTs = Math.floor(
        (Date.now() - maxLiveAgeHours * 60 * 60 * 1000) / 1000
      );

      const candidates = await prisma.fixtures.findMany({
        where: {
          state: { in: [...LIVE_STATES] as FixtureState[] },
          startTs: { lte: cutoffTs },
        },
        select: { externalId: true },
      });

      if (!candidates.length) {
        return {
          result: {
            jobRunId,
            candidates: 0,
            fetched: 0,
            updated: 0,
            skipped: false,
          },
          rowsAffected: 0,
          meta: {
            maxLiveAgeHours,
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
            skipped: false,
          },
          rowsAffected: 0,
          meta: {
            maxLiveAgeHours,
            dryRun: !!opts.dryRun,
            reason: "no-valid-external-ids",
            candidates: candidates.length,
          },
        };
      }

      let fetched: Awaited<ReturnType<typeof adapter.fetchFixturesByIds>> = [];
      for (const group of chunk(ids, 50)) {
        if (opts.signal?.aborted) {
          log.warn("finished-fixtures fetch aborted by signal");
          break;
        }
        const part = await adapter.fetchFixturesByIds(group, {
          includeScores: true,
          filters: { fixtureStates: "5" },
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
            skipped: false,
          },
          rowsAffected: 0,
          meta: {
            maxLiveAgeHours,
            dryRun: !!opts.dryRun,
            reason: "no-finished-fixtures",
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
            skipped: false,
          },
          rowsAffected: 0,
          meta: {
            maxLiveAgeHours,
            dryRun: true,
            candidates: candidates.length,
            fetched: fetched.length,
          },
        };
      }

      const result = await syncFixtures(fetched, {
        dryRun: false,
        signal: opts.signal,
      });
      const updated = result.updated;
      const failed = result.failed;

      // Settle predictions for FT fixtures
      const ftFixtures = await prisma.fixtures.findMany({
        where: {
          externalId: { in: fetched.map((f) => BigInt(f.externalId)) },
          state: { in: [...FINISHED_STATES] as FixtureState[] },
        },
        select: { id: true },
      });

      const settlement = await settlePredictionsForFixtures(
        ftFixtures.map((f) => f.id),
        fastify.io
      );

      // Emit fixture_ft chat events for affected groups
      if (ftFixtures.length > 0) {
        const ftFixturesWithTeams = await prisma.fixtures.findMany({
          where: { id: { in: ftFixtures.map((f) => f.id) } },
          select: {
            id: true,
            homeScore: true,
            awayScore: true,
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
          failed,
          skipped: false,
        },
        rowsAffected: result.total,
        meta: {
          maxLiveAgeHours,
          dryRun: false,
          candidates: candidates.length,
          fetched: fetched.length,
          updated,
          failed,
          inserted: result.inserted,
          skipped: result.skipped,
          settlement: {
            settled: settlement.settled,
            skipped: settlement.skipped,
            groupsEnded: settlement.groupsEnded,
          },
        },
      };
    },
  });
}
