// src/etl/seeds/seed.leagues.ts
import type { LeagueDTO } from "@repo/types/sport-data/common";
import {
  startSeedBatch,
  trackSeedItem,
  finishSeedBatch,
  chunk,
  safeBigInt,
  normShortCode,
  computeChanges,
} from "./seed.utils";
import { RunStatus, RunTrigger, prisma } from "@repo/db";
import { getLogger } from "../../logger";

const log = getLogger("SeedLeagues");
const CHUNK_SIZE = 8;

export async function seedLeagues(
  leagues: LeagueDTO[],
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
      { count: leagues?.length ?? 0 },
      "Dry run mode; no DB changes"
    );
    return { batchId: null, ok: 0, fail: 0, total: leagues?.length ?? 0 };
  }

  let batchId = opts?.batchId;
  let createdHere = false;

  if (!batchId) {
    const started = await startSeedBatch(
      "seed-leagues",
      opts?.version ?? "v1",
      { totalInput: leagues?.length ?? 0, dryRun: !!opts?.dryRun },
      {
        trigger: opts?.trigger ?? RunTrigger.manual,
        triggeredBy: opts?.triggeredBy ?? null,
        triggeredById: opts?.triggeredById ?? null,
      }
    );
    batchId = started.id;
    createdHere = true;
  }

  if (!leagues?.length) {
    await finishSeedBatch(batchId!, RunStatus.success, {
      itemsTotal: 0,
      itemsSuccess: 0,
      itemsFailed: 0,
      meta: { reason: "no-input" },
    });
    return { batchId, ok: 0, fail: 0, total: 0 };
  }

  log.info({ count: leagues.length }, "Starting leagues seeding");

  // De-dupe input
  const seen = new Set<string>();
  const uniqueLeagues: typeof leagues = [];
  const duplicates: typeof leagues = [];

  for (const league of leagues) {
    const key = String(league.externalId);
    if (seen.has(key)) {
      duplicates.push(league);
    } else {
      seen.add(key);
      uniqueLeagues.push(league);
    }
  }

  if (duplicates.length > 0) {
    log.warn(
      { duplicates: duplicates.length, unique: uniqueLeagues.length },
      "Input contained duplicate leagues; processing unique items"
    );
    const duplicatePromises = duplicates.map((league) =>
      trackSeedItem(
        batchId!,
        String(league.externalId),
        RunStatus.skipped,
        undefined,
        {
          entityType: "league",
          name: league.name,
          reason: "duplicate",
        }
      )
    );
    await Promise.allSettled(duplicatePromises);
  }

  // Batch lookup countries
  const countryExternalIds = uniqueLeagues
    .map((l) => l.countryExternalId)
    .filter((id): id is string | number => id != null);
  const uniqueCountryIds = [...new Set(countryExternalIds.map(String))];
  const countryMap = new Map<string, number>();

  if (uniqueCountryIds.length > 0) {
    const countries = await prisma.countries.findMany({
      where: {
        externalId: { in: uniqueCountryIds.map((id) => safeBigInt(id)) },
      },
      select: { id: true, externalId: true },
    });

    for (const country of countries) {
      countryMap.set(String(country.externalId), country.id);
    }

    log.info(
      { batchId, found: countries.length, requested: uniqueCountryIds.length },
      "Country lookup completed"
    );
  }

  // Pre-fetch which leagues already exist (with all tracked fields for change detection)
  const allExternalIds = uniqueLeagues.map((l) => safeBigInt(l.externalId));
  const existingRows = await prisma.leagues.findMany({
    where: { externalId: { in: allExternalIds } },
    select: {
      externalId: true,
      name: true,
      shortCode: true,
      imagePath: true,
      type: true,
      subType: true,
    },
  });
  const existingByExtId = new Map(
    existingRows.map((r) => [String(r.externalId), r])
  );
  const existingSet = new Set(existingRows.map((r) => String(r.externalId)));

  let ok = 0;
  let fail = 0;

  try {
    for (const group of chunk(uniqueLeagues, CHUNK_SIZE)) {
      // Process all leagues in the chunk in parallel
      const chunkResults = await Promise.allSettled(
        group.map(async (league) => {
          const action = existingSet.has(String(league.externalId)) ? "updated" : "inserted";
          try {
            if (!league.name) {
              throw new Error(
                `No name specified for league (externalId: ${league.externalId})`
              );
            }

            if (!league.type) {
              throw new Error(
                `No type specified for league ${league.name} (externalId: ${league.externalId})`
              );
            }

            const countryId =
              league.countryExternalId != null
                ? (countryMap.get(String(league.countryExternalId)) ?? null)
                : null;

            if (!countryId) {
              throw new Error(
                `No valid country ID found for league ${league.name} (externalId: ${league.externalId})`
              );
            }

            const shortCode = normShortCode(league.shortCode);

            const updatePayload = {
              name: league.name,
              shortCode: shortCode ?? null,
              imagePath: league.imagePath ?? null,
              countryId: countryId,
              type: league.type,
              subType: league.subType ?? null,
              updatedAt: new Date(),
            };

            await prisma.leagues.upsert({
              where: { externalId: safeBigInt(league.externalId) },
              update: updatePayload,
              create: {
                externalId: safeBigInt(league.externalId),
                name: league.name,
                shortCode: shortCode ?? null,
                imagePath: league.imagePath ?? null,
                countryId: countryId,
                type: league.type,
                subType: league.subType ?? null,
              },
            });

            // Compute changes for update tracking
            const existing = existingByExtId.get(String(league.externalId));
            const changes = action === "updated"
              ? computeChanges(existing, updatePayload, ["name", "shortCode", "imagePath", "type", "subType"])
              : null;

            await trackSeedItem(
              batchId!,
              String(league.externalId),
              RunStatus.success,
              undefined,
              {
                entityType: "league",
                name: league.name,
                externalId: league.externalId,
                action,
                ...(changes && { changes }),
              }
            );

            return { success: true, league, action };
          } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            const errorCode =
              e && typeof e === "object" && "code" in e
                ? String((e as { code?: string }).code)
                : "UNKNOWN_ERROR";

            await trackSeedItem(
              batchId!,
              String(league.externalId),
              RunStatus.failed,
              errorMessage.slice(0, 500),
              {
                entityType: "league",
                name: league.name,
                externalId: league.externalId,
                errorCode,
                errorMessage: errorMessage.slice(0, 200),
                action,
              }
            );

            log.error(
              { batchId, leagueName: league.name, externalId: league.externalId, err: e },
              "League failed"
            );

            return { success: false, league, error: errorMessage, action };
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
      "Leagues seeding completed"
    );
    return { batchId, ok, fail, total: ok + fail };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    log.error({ batchId, err: e }, "Unexpected error during leagues seeding");
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

