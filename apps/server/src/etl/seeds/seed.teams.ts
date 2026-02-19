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
  computeChanges,
} from "./seed.utils";
import { RunStatus, RunTrigger, prisma } from "@repo/db";
import { getLogger } from "../../logger";

const log = getLogger("SeedTeams");
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
    log.info(
      { count: teams?.length ?? 0 },
      "Dry run mode; no DB changes"
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
    if (createdHere) {
      await finishSeedBatch(batchId!, RunStatus.success, {
        itemsTotal: 0,
        itemsSuccess: 0,
        itemsFailed: 0,
        meta: { reason: "no-input" },
      });
    }
    return { batchId, ok: 0, fail: 0, total: 0 };
  }

  log.info({ count: teams.length }, "Starting teams seeding");

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
    log.warn(
      { duplicates: duplicates.length, unique: uniqueTeams.length },
      "Input contained duplicate teams; processing unique items"
    );
    const duplicatePromises = duplicates.map((team) =>
      trackSeedItem(
        batchId!,
        String(team.externalId),
        RunStatus.skipped,
        undefined,
        {
          entityType: "team",
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

    log.info(
      { batchId, found: countries.length, requested: uniqueCountryIds.length },
      "Country lookup completed"
    );
  }

  let ok = 0;
  let fail = 0;

  // Pre-fetch which teams already exist (with all tracked fields for change detection)
  const allExternalIds = uniqueTeams.map((t) => safeBigInt(t.externalId));
  const existingRows = await prisma.teams.findMany({
    where: { externalId: { in: allExternalIds } },
    select: {
      externalId: true,
      name: true,
      shortCode: true,
      imagePath: true,
      founded: true,
      type: true,
    },
  });
  const existingByExtId = new Map(
    existingRows.map((r) => [String(r.externalId), r])
  );
  const existingSet = new Set(existingRows.map((r) => String(r.externalId)));

  try {
    for (const group of chunk(uniqueTeams, CHUNK_SIZE)) {
      // Process all teams in the chunk in parallel
      const chunkResults = await Promise.allSettled(
        group.map(async (team) => {
          const action = existingSet.has(String(team.externalId)) ? "updated" : "inserted";
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

            const updatePayload = {
              name: team.name,
              shortCode: shortCode ?? null,
              imagePath: team.imagePath ?? null,
              founded: founded ?? null,
              type: team.type ?? null,
              countryId: countryId ?? null,
              updatedAt: new Date(),
            };

            await prisma.teams.upsert({
              where: { externalId: safeBigInt(team.externalId) },
              update: updatePayload,
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

            // Compute changes for update tracking
            const existing = existingByExtId.get(String(team.externalId));
            const changes = action === "updated"
              ? computeChanges(existing, updatePayload, ["name", "shortCode", "imagePath", "founded", "type"])
              : null;

            await trackSeedItem(
              batchId!,
              String(team.externalId),
              RunStatus.success,
              undefined,
              {
                entityType: "team",
                name: team.name,
                externalId: team.externalId,
                action,
                ...(changes && { changes }),
              }
            );

            return { success: true, team, action };
          } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            const errorCode =
              e && typeof e === "object" && "code" in e
                ? String((e as { code?: string }).code)
                : "UNKNOWN_ERROR";
            const failedAction = action === "updated" ? "update_failed" : "insert_failed";

            await trackSeedItem(
              batchId!,
              String(team.externalId),
              RunStatus.failed,
              errorMessage.slice(0, 500),
              {
                entityType: "team",
                name: team.name,
                externalId: team.externalId,
                errorCode,
                errorMessage: errorMessage.slice(0, 200),
                action: failedAction,
              }
            );

            log.error(
              { batchId, teamName: team.name, externalId: team.externalId, err: e },
              "Team failed"
            );

            return { success: false, team, error: errorMessage, action: failedAction };
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

    if (createdHere) {
      await finishSeedBatch(batchId!, RunStatus.success, {
        itemsTotal: ok + fail,
        itemsSuccess: ok,
        itemsFailed: fail,
        meta: { ok, fail },
      });
    }

    log.info(
      { batchId, ok, fail },
      "Teams seeding completed"
    );
    return { batchId, ok, fail, total: ok + fail };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    log.error({ batchId, err: e }, "Unexpected error during teams seeding");
    if (createdHere) {
      await finishSeedBatch(batchId!, RunStatus.failed, {
        itemsTotal: ok + fail,
        itemsSuccess: ok,
        itemsFailed: fail,
        errorMessage: msg.slice(0, 500),
        meta: { ok, fail },
      });
    }

    return { batchId, ok, fail, total: ok + fail };
  }
}
