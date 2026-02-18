import { prisma } from "@repo/db";
import type { Prisma } from "@repo/db";
import { RunStatus } from "@repo/db";
import { finishSeedBatch } from "../../etl/seeds/seed.utils";
import { processSeedSeason } from "./seed-season.job";
import { availabilityService } from "../../services/availability.service";
import { getLogger } from "../../logger";

const log = getLogger("BatchSeedSeasons");

interface SeasonStatus {
  seasonExternalId: number;
  status: "pending" | "processing" | "done" | "failed";
  error?: string;
  result?: {
    season: { id: number; name: string; league: string; created: boolean };
    teams?: { ok: number; fail: number; total: number };
    fixtures?: { ok: number; fail: number; total: number };
  };
}

export interface BatchSeedParams {
  batchId: number;
  seasonExternalIds: number[];
  includeTeams: boolean;
  includeFixtures: boolean;
  futureOnly: boolean;
  triggeredBy?: string | null;
  triggeredById?: string | null;
}

/**
 * Processes a batch of seasons sequentially using an already-created batch record.
 * Updates batch meta after each season so the frontend can poll for progress.
 */
export async function processBatchSeedSeasons(params: BatchSeedParams) {
  const {
    batchId,
    seasonExternalIds,
    includeTeams,
    includeFixtures,
    futureOnly,
    triggeredBy,
    triggeredById,
  } = params;

  const seasons: SeasonStatus[] = seasonExternalIds.map((id) => ({
    seasonExternalId: id,
    status: "pending" as const,
  }));

  let completedCount = 0;
  let failedCount = 0;

  for (const seasonStatus of seasons) {
    seasonStatus.status = "processing";
    await updateBatchMeta(batchId, seasons, completedCount, failedCount);

    try {
      const result = await processSeedSeason({
        seasonExternalId: seasonStatus.seasonExternalId,
        includeTeams,
        includeFixtures,
        futureOnly,
        batchId,
        triggeredBy,
        triggeredById,
        skipBatchFinish: true,
      });

      seasonStatus.status = "done";
      seasonStatus.result = {
        season: result.season,
        teams: result.teams,
        fixtures: result.fixtures,
      };
      completedCount++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error(
        { batchId, seasonExternalId: seasonStatus.seasonExternalId, err: error },
        "Failed to seed season in batch"
      );
      seasonStatus.status = "failed";
      seasonStatus.error = message.slice(0, 500);
      failedCount++;
    }

    await updateBatchMeta(batchId, seasons, completedCount, failedCount);
  }

  const finalStatus =
    failedCount === seasonExternalIds.length
      ? RunStatus.failed
      : RunStatus.success;

  await finishSeedBatch(batchId, finalStatus, {
    itemsTotal: seasonExternalIds.length,
    itemsSuccess: completedCount,
    itemsFailed: failedCount,
    meta: {
      seasons: JSON.parse(JSON.stringify(seasons)) as Prisma.InputJsonValue,
      totalSeasons: seasonExternalIds.length,
      completedSeasons: completedCount,
      failedSeasons: failedCount,
    },
  });

  await availabilityService.invalidateCache();
}

async function updateBatchMeta(
  batchId: number,
  seasons: SeasonStatus[],
  completedCount: number,
  failedCount: number
) {
  await prisma.seedBatches.update({
    where: { id: batchId },
    data: {
      meta: {
        seasons: JSON.parse(JSON.stringify(seasons)) as Prisma.InputJsonValue,
        totalSeasons: seasons.length,
        completedSeasons: completedCount,
        failedSeasons: failedCount,
      },
    },
  });
}
