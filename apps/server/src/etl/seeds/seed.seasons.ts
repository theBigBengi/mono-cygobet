// src/etl/seeds/seed.seasons.ts
import type { SeasonDTO } from "@repo/types/sport-data/common";
import {
  startSeedBatch,
  trackSeedItem,
  finishSeedBatch,
  chunk,
  normalizeDate,
  computeChanges,
} from "./seed.utils";
import { RunStatus, RunTrigger, prisma } from "@repo/db";
import { getLogger } from "../../logger";

const log = getLogger("SeedSeasons");
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
    log.info(
      { count: seasons?.length ?? 0 },
      "Dry run mode; no DB changes"
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

  log.info({ count: seasons.length }, "Starting seasons seeding");

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
    log.warn(
      { duplicates: duplicates.length, unique: uniqueSeasons.length },
      "Input contained duplicate seasons; processing unique items"
    );
    const duplicatePromises = duplicates.map((season) =>
      trackSeedItem(
        batchId!,
        String(season.externalId),
        RunStatus.skipped,
        undefined,
        {
          entityType: "season",
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
        externalId: { in: uniqueLeagueIds.map((id) => String(id)) },
      },
      select: { id: true, externalId: true },
    });

    for (const league of leagues) {
      leagueMap.set(String(league.externalId), league.id);
    }

    log.info(
      { batchId, found: leagues.length, requested: uniqueLeagueIds.length },
      "League lookup completed"
    );
  }

  // Pre-fetch which seasons already exist (with all tracked fields for change detection)
  const allExternalIds = uniqueSeasons.map((s) => String(s.externalId));
  const existingRows = await prisma.seasons.findMany({
    where: { externalId: { in: allExternalIds } },
    select: {
      externalId: true,
      name: true,
      startDate: true,
      endDate: true,
      isCurrent: true,
    },
  });
  const existingByExtId = new Map(
    existingRows.map((r) => [String(r.externalId), r])
  );
  const existingSet = new Set(existingRows.map((r) => String(r.externalId)));

  let ok = 0;
  let fail = 0;

  try {
    for (const group of chunk(uniqueSeasons, CHUNK_SIZE)) {
      // Process all seasons in the chunk in parallel
      const chunkResults = await Promise.allSettled(
        group.map(async (season) => {
          const action = existingSet.has(String(season.externalId)) ? "updated" : "inserted";
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

            const updatePayload = {
              name: season.name,
              startDate,
              endDate,
              isCurrent: season.isCurrent,
              leagueId,
              updatedAt: new Date(),
            };

            await prisma.seasons.upsert({
              where: { externalId: String(season.externalId) },
              update: updatePayload,
              create: {
                externalId: String(season.externalId),
                name: season.name,
                startDate,
                endDate,
                isCurrent: season.isCurrent,
                leagueId,
              },
            });

            // Compute changes for update tracking
            const existing = existingByExtId.get(String(season.externalId));
            const changes = action === "updated"
              ? computeChanges(existing, updatePayload, ["name", "startDate", "endDate", "isCurrent"])
              : null;

            await trackSeedItem(
              batchId!,
              String(season.externalId),
              RunStatus.success,
              undefined,
              {
                entityType: "season",
                name: season.name,
                externalId: season.externalId,
                action,
                ...(changes && { changes }),
              }
            );

            return { success: true, season, action };
          } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            const errorCode =
              e && typeof e === "object" && "code" in e
                ? String((e as { code?: string }).code)
                : "UNKNOWN_ERROR";

            const failedAction = action === "updated" ? "update_failed" : "insert_failed";

            await trackSeedItem(
              batchId!,
              String(season.externalId),
              RunStatus.failed,
              errorMessage.slice(0, 500),
              {
                entityType: "season",
                name: season.name,
                externalId: season.externalId,
                errorCode,
                errorMessage: errorMessage.slice(0, 200),
                action: failedAction,
              }
            );

            log.error(
              { batchId, seasonName: season.name, externalId: season.externalId, err: e },
              "Season failed"
            );

            return { success: false, season, error: errorMessage, action: failedAction };
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

    log.info(
      { batchId, ok, fail },
      "Seasons seeding completed"
    );
    return { batchId, ok, fail, total: ok + fail };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    log.error({ batchId, err: e }, "Unexpected error during seasons seeding");
    await finishSeedBatch(batchId!, RunStatus.failed, {
      itemsTotal: ok + fail,
      itemsSuccess: ok,
      itemsFailed: fail,
      errorMessage: msg.slice(0, 500),
      meta: { ok, fail },
    });

    return { batchId, ok, fail, total: ok + fail };
  }
}

