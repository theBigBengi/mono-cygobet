// src/etl/seeds/seed.seasons.ts
import type { SeasonDTO } from "@repo/types/sport-data/common";
import {
  startSeedBatch,
  trackSeedItem,
  finishSeedBatch,
  chunk,
  safeBigInt,
  normalizeDate,
} from "./seed.utils";
import { RunStatus, RunTrigger, prisma } from "@repo/db";

const CHUNK_SIZE = 8;

export async function seedSeasons(
  seasons: SeasonDTO[],
  opts?: {
    batchId?: number;
    version?: string;
    trigger?: RunTrigger;
    triggeredBy?: string | null;
    triggeredById?: string | null;
    dryRun?: boolean;
  }
) {
  // In dry-run mode, skip all database writes including batch tracking
  if (opts?.dryRun) {
    console.log(
      `🧪 DRY RUN MODE: ${seasons?.length ?? 0} seasons would be processed (no database changes)`
    );
    return { batchId: null, ok: 0, fail: 0, total: seasons?.length ?? 0 };
  }

  let batchId = opts?.batchId;
  let createdHere = false;

  if (!batchId) {
    const started = await startSeedBatch(
      "seed-seasons",
      opts?.version ?? "v1",
      { totalInput: seasons?.length ?? 0, dryRun: !!opts?.dryRun },
      {
        trigger: opts?.trigger ?? RunTrigger.manual,
        triggeredBy: opts?.triggeredBy ?? null,
        triggeredById: opts?.triggeredById ?? null,
      }
    );
    batchId = started.id;
    createdHere = true;
  }

  if (!seasons?.length) {
    await finishSeedBatch(batchId!, RunStatus.success, {
      itemsTotal: 0,
      itemsSuccess: 0,
      itemsFailed: 0,
      meta: { reason: "no-input" },
    });
    return { batchId, ok: 0, fail: 0, total: 0 };
  }

  console.log(
    `📅 Starting seasons seeding: ${seasons.length} seasons to process`
  );

  // De-dupe input
  const seen = new Set<string>();
  const uniqueSeasons: typeof seasons = [];
  const duplicates: typeof seasons = [];

  for (const season of seasons) {
    const key = String(season.externalId);
    if (seen.has(key)) {
      duplicates.push(season);
    } else {
      seen.add(key);
      uniqueSeasons.push(season);
    }
  }

  if (duplicates.length > 0) {
    console.log(
      `⚠️  Input contained ${duplicates.length} duplicate seasons, processing ${uniqueSeasons.length} unique items`
    );
    const duplicatePromises = duplicates.map((season) =>
      trackSeedItem(
        batchId!,
        String(season.externalId),
        RunStatus.skipped,
        undefined,
        {
          name: season.name,
          reason: "duplicate",
        }
      )
    );
    await Promise.allSettled(duplicatePromises);
  }

  // Batch lookup leagues
  const leagueExternalIds = uniqueSeasons
    .map((s) => s.leagueExternalId)
    .filter((id): id is number | string => id != null);
  const uniqueLeagueIds = [...new Set(leagueExternalIds.map(String))];
  const leagueMap = new Map<string, number>();

  if (uniqueLeagueIds.length > 0) {
    const leagues = await prisma.leagues.findMany({
      where: {
        externalId: { in: uniqueLeagueIds.map((id) => safeBigInt(id)) },
      },
      select: { id: true, externalId: true },
    });

    for (const league of leagues) {
      leagueMap.set(String(league.externalId), league.id);
    }

    console.log(
      `✅ [${batchId}] League lookup completed: ${leagues.length}/${uniqueLeagueIds.length} leagues found`
    );
  }

  let ok = 0;
  let fail = 0;

  try {
    for (const group of chunk(uniqueSeasons, CHUNK_SIZE)) {
      // Process all seasons in the chunk in parallel
      const chunkResults = await Promise.allSettled(
        group.map(async (season) => {
          try {
            if (!season.name) {
              throw new Error(
                `No name specified for season (externalId: ${season.externalId})`
              );
            }

            const leagueId = leagueMap.get(String(season.leagueExternalId));
            if (!leagueId) {
              throw new Error(
                `League not found for season ${season.name} (leagueExternalId: ${season.leagueExternalId})`
              );
            }

            const startDate = normalizeDate(season.startDate);
            const endDate = normalizeDate(season.endDate);

            await prisma.seasons.upsert({
              where: { externalId: safeBigInt(season.externalId) },
              update: {
                name: season.name,
                startDate,
                endDate,
                isCurrent: season.isCurrent,
                leagueId,
                updatedAt: new Date(),
              },
              create: {
                externalId: safeBigInt(season.externalId),
                name: season.name,
                startDate,
                endDate,
                isCurrent: season.isCurrent,
                leagueId,
              },
            });

            await trackSeedItem(
              batchId!,
              String(season.externalId),
              RunStatus.success,
              undefined,
              {
                name: season.name,
                externalId: season.externalId,
              }
            );

            return { success: true, season };
          } catch (e: any) {
            const errorCode = e?.code || "UNKNOWN_ERROR";
            const errorMessage = e?.message || "Unknown error";

            await trackSeedItem(
              batchId!,
              String(season.externalId),
              RunStatus.failed,
              errorMessage.slice(0, 500),
              {
                name: season.name,
                externalId: season.externalId,
                errorCode,
                errorMessage: errorMessage.slice(0, 200),
              }
            );

            console.log(
              `❌ [${batchId}] Season failed: ${season.name} (ID: ${season.externalId}) - ${errorMessage}`
            );

            return { success: false, season, error: errorMessage };
          }
        })
      );

      // Count successes and failures from this chunk
      for (const result of chunkResults) {
        if (result.status === "fulfilled") {
          if (result.value.success) {
            ok++;
          } else {
            fail++;
          }
        } else {
          fail++;
        }
      }
    }

    await finishSeedBatch(batchId!, RunStatus.success, {
      itemsTotal: ok + fail,
      itemsSuccess: ok,
      itemsFailed: fail,
      meta: { ok, fail },
    });

    console.log(
      `🎉 [${batchId}] Seasons seeding completed: ${ok} success, ${fail} failed`
    );
    return { batchId, ok, fail, total: ok + fail };
  } catch (e: any) {
    console.log(
      `💥 [${batchId}] Unexpected error during seasons seeding: ${
        e?.message || "Unknown error"
      }`
    );
    await finishSeedBatch(batchId!, RunStatus.failed, {
      itemsTotal: ok + fail,
      itemsSuccess: ok,
      itemsFailed: fail,
      errorMessage: String(e?.message ?? e).slice(0, 500),
      meta: { ok, fail },
    });

    return { batchId, ok, fail, total: ok + fail };
  }
}

