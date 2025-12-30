// src/etl/seeds/seed.teams.ts
import type { TeamDTO } from "@repo/types/sport-data/common";
import {
  startSeedBatch,
  trackSeedItem,
  finishSeedBatch,
  chunk,
  safeBigInt,
  normShortCode,
  validateFounded,
} from "./seed.utils";
import { RunStatus, RunTrigger, prisma } from "@repo/db";

const CHUNK_SIZE = 8;

export async function seedTeams(
  teams: TeamDTO[],
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
      `🧪 DRY RUN MODE: ${teams?.length ?? 0} teams would be processed (no database changes)`
    );
    return { batchId: null, ok: 0, fail: 0, total: teams?.length ?? 0 };
  }

  let batchId = opts?.batchId;
  let createdHere = false;

  if (!batchId) {
    const started = await startSeedBatch(
      "seed-teams",
      opts?.version ?? "v1",
      { totalInput: teams?.length ?? 0, dryRun: !!opts?.dryRun },
      {
        trigger: opts?.trigger ?? RunTrigger.manual,
        triggeredBy: opts?.triggeredBy ?? null,
        triggeredById: opts?.triggeredById ?? null,
      }
    );
    batchId = started.id;
    createdHere = true;
  }

  if (!teams?.length) {
    await finishSeedBatch(batchId!, RunStatus.success, {
      itemsTotal: 0,
      itemsSuccess: 0,
      itemsFailed: 0,
      meta: { reason: "no-input" },
    });
    return { batchId, ok: 0, fail: 0, total: 0 };
  }

  console.log(`⚽ Starting teams seeding: ${teams.length} teams to process`);

  // De-dupe input
  const seen = new Set<string>();
  const uniqueTeams: typeof teams = [];
  const duplicates: typeof teams = [];

  for (const team of teams) {
    const key = String(team.externalId);
    if (seen.has(key)) {
      duplicates.push(team);
    } else {
      seen.add(key);
      uniqueTeams.push(team);
    }
  }

  if (duplicates.length > 0) {
    console.log(
      `⚠️  Input contained ${duplicates.length} duplicate teams, processing ${uniqueTeams.length} unique items`
    );
    const duplicatePromises = duplicates.map((team) =>
      trackSeedItem(
        batchId!,
        String(team.externalId),
        RunStatus.skipped,
        undefined,
        {
          name: team.name,
          reason: "duplicate",
        }
      )
    );
    await Promise.allSettled(duplicatePromises);
  }

  // Batch lookup countries
  const countryExternalIds = uniqueTeams
    .map((t) => t.countryExternalId)
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

    console.log(
      `✅ [${batchId}] Country lookup completed: ${countries.length}/${uniqueCountryIds.length} countries found`
    );
  }

  let ok = 0;
  let fail = 0;

  try {
    for (const group of chunk(uniqueTeams, CHUNK_SIZE)) {
      // Process all teams in the chunk in parallel
      const chunkResults = await Promise.allSettled(
        group.map(async (team) => {
          try {
            if (!team.name) {
              throw new Error(
                `No name specified for team (externalId: ${team.externalId})`
              );
            }

            const countryId =
              team.countryExternalId != null
                ? (countryMap.get(String(team.countryExternalId)) ?? null)
                : null;

            const shortCode = normShortCode(team.shortCode);
            const founded = validateFounded(team.founded);

            await prisma.teams.upsert({
              where: { externalId: safeBigInt(team.externalId) },
              update: {
                name: team.name,
                shortCode: shortCode ?? undefined,
                imagePath: team.imagePath ?? undefined,
                founded: founded ?? undefined,
                type: team.type ?? undefined,
                countryId: countryId ?? undefined,
                updatedAt: new Date(),
              },
              create: {
                externalId: safeBigInt(team.externalId),
                name: team.name,
                shortCode: shortCode ?? null,
                imagePath: team.imagePath ?? null,
                founded: founded ?? null,
                type: team.type ?? null,
                countryId: countryId ?? null,
              },
            });

            await trackSeedItem(
              batchId!,
              String(team.externalId),
              RunStatus.success,
              undefined,
              {
                name: team.name,
                externalId: team.externalId,
              }
            );

            return { success: true, team };
          } catch (e: any) {
            const errorCode = e?.code || "UNKNOWN_ERROR";
            const errorMessage = e?.message || "Unknown error";

            await trackSeedItem(
              batchId!,
              String(team.externalId),
              RunStatus.failed,
              errorMessage.slice(0, 500),
              {
                name: team.name,
                externalId: team.externalId,
                errorCode,
                errorMessage: errorMessage.slice(0, 200),
              }
            );

            console.log(
              `❌ [${batchId}] Team failed: ${team.name} (ID: ${team.externalId}) - ${errorMessage}`
            );

            return { success: false, team, error: errorMessage };
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
      `🎉 [${batchId}] Teams seeding completed: ${ok} success, ${fail} failed`
    );
    return { batchId, ok, fail, total: ok + fail };
  } catch (e: any) {
    console.log(
      `💥 [${batchId}] Unexpected error during teams seeding: ${
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
