// src/etl/seeds/seed.fixtures.ts
import type { FixtureDTO } from "@repo/types/sport-data/common";
import {
  startSeedBatch,
  trackSeedItem,
  finishSeedBatch,
  chunk,
  safeBigInt,
} from "./seed.utils";
import { RunStatus, RunTrigger, prisma } from "@repo/db";
import {
  transformFixtureDto,
  isValidFixtureStateTransition,
} from "../transform/fixtures.transform";
import { getLogger } from "../../logger";

const log = getLogger("SeedFixtures");
const CHUNK_SIZE = 8;

export async function seedFixtures(
  fixtures: FixtureDTO[],
  opts?: {
    batchId?: number;
    version?: string;
    trigger?: RunTrigger;
    triggeredBy?: string | null;
    triggeredById?: string | null;
    dryRun?: boolean;
  }
): Promise<{
  batchId: number | null;
  ok: number;
  fail: number;
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  firstError?: string;
}> {
  // In dry-run mode, skip all database writes including batch tracking
  if (opts?.dryRun) {
    console.log(
      `🧪 DRY RUN MODE: ${fixtures?.length ?? 0} fixtures would be processed (no database changes)`
    );
    return {
      batchId: null,
      ok: 0,
      fail: 0,
      total: fixtures?.length ?? 0,
      inserted: 0,
      updated: 0,
      skipped: fixtures?.length ?? 0,
    };
  }

  let batchId = opts?.batchId;
  let createdHere = false;

  if (!batchId) {
    const started = await startSeedBatch(
      "seed-fixtures",
      opts?.version ?? "v1",
      { totalInput: fixtures?.length ?? 0, dryRun: !!opts?.dryRun },
      {
        trigger: opts?.trigger ?? RunTrigger.manual,
        triggeredBy: opts?.triggeredBy ?? null,
        triggeredById: opts?.triggeredById ?? null,
      }
    );
    batchId = started.id;
    createdHere = true;
  }

  if (!fixtures?.length) {
    await finishSeedBatch(batchId!, RunStatus.success, {
      itemsTotal: 0,
      itemsSuccess: 0,
      itemsFailed: 0,
      meta: { reason: "no-input" },
    });
    return {
      batchId,
      ok: 0,
      fail: 0,
      total: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
    };
  }

  console.log(
    `⚽ Starting fixtures seeding: ${fixtures.length} fixtures to process`
  );

  // De-dupe input
  const seen = new Set<string>();
  const uniqueFixtures: typeof fixtures = [];
  const duplicates: typeof fixtures = [];

  for (const fixture of fixtures) {
    const key = String(fixture.externalId);
    if (seen.has(key)) {
      duplicates.push(fixture);
    } else {
      seen.add(key);
      uniqueFixtures.push(fixture);
    }
  }

  if (duplicates.length > 0) {
    console.log(
      `⚠️  Input contained ${duplicates.length} duplicate fixtures, processing ${uniqueFixtures.length} unique items`
    );
    const duplicatePromises = duplicates.map((fixture) =>
      trackSeedItem(
        batchId!,
        String(fixture.externalId),
        RunStatus.skipped,
        undefined,
        {
          name: fixture.name,
          reason: "duplicate",
          action: "skip",
        }
      )
    );
    await Promise.allSettled(duplicatePromises);
  }

  // Batch lookup leagues
  const leagueExternalIds = uniqueFixtures
    .map((f) => f.leagueExternalId)
    .filter((id): id is number => id != null);
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

  // Batch lookup seasons
  const seasonExternalIds = uniqueFixtures
    .map((f) => f.seasonExternalId)
    .filter((id): id is number => id != null);
  const uniqueSeasonIds = [...new Set(seasonExternalIds.map(String))];
  const seasonMap = new Map<string, number>();

  if (uniqueSeasonIds.length > 0) {
    const seasons = await prisma.seasons.findMany({
      where: {
        externalId: { in: uniqueSeasonIds.map((id) => safeBigInt(id)) },
      },
      select: { id: true, externalId: true },
    });

    for (const season of seasons) {
      seasonMap.set(String(season.externalId), season.id);
    }

    console.log(
      `✅ [${batchId}] Season lookup completed: ${seasons.length}/${uniqueSeasonIds.length} seasons found`
    );
  }

  // Batch lookup teams (both home and away)
  const homeTeamIds = uniqueFixtures.map((f) => f.homeTeamExternalId);
  const awayTeamIds = uniqueFixtures.map((f) => f.awayTeamExternalId);
  const allTeamIds = [...new Set([...homeTeamIds, ...awayTeamIds].map(String))];
  const teamMap = new Map<string, number>();

  if (allTeamIds.length > 0) {
    const teams = await prisma.teams.findMany({
      where: {
        externalId: { in: allTeamIds.map((id) => safeBigInt(id)) },
      },
      select: { id: true, externalId: true },
    });

    for (const team of teams) {
      teamMap.set(String(team.externalId), team.id);
    }

    console.log(
      `✅ [${batchId}] Team lookup completed: ${teams.length}/${allTeamIds.length} teams found`
    );
  }

  let ok = 0;
  let fail = 0;
  let inserted = 0;
  let updated = 0;
  let skipped = duplicates.length;

  try {
    for (const group of chunk(uniqueFixtures, CHUNK_SIZE)) {
      // Pre-fetch which fixtures already exist (externalId + state for validation).
      const groupExternalIds = group.map((f) => safeBigInt(f.externalId));
      const existingRows = await prisma.fixtures.findMany({
        where: { externalId: { in: groupExternalIds } },
        select: { externalId: true, state: true },
      });
      const existingByExtId = new Map(
        existingRows.map((r) => [String(r.externalId), r])
      );
      const existingSet = new Set(existingRows.map((r) => String(r.externalId)));

      // Process all fixtures in the chunk in parallel
      const chunkResults = await Promise.allSettled(
        group.map(async (fixture) => {
          try {
            const extIdKey = String(safeBigInt(fixture.externalId));
            const action = existingSet.has(extIdKey) ? "update" : "insert";

            if (!fixture.name) {
              throw new Error(
                `No name specified for fixture (externalId: ${fixture.externalId})`
              );
            }

            if (!fixture.startTs) {
              throw new Error(
                `No start timestamp specified for fixture (externalId: ${fixture.externalId})`
              );
            }

            const payload = transformFixtureDto(fixture);

            // State validation: if updating, disallow invalid state transitions.
            const existing = existingByExtId.get(extIdKey);
            if (existing && !isValidFixtureStateTransition(existing.state, payload.state)) {
              log.warn(
                { externalId: fixture.externalId, current: existing.state, next: payload.state },
                "Invalid fixture state transition; skipping update"
              );
              await trackSeedItem(
                batchId!,
                String(fixture.externalId),
                RunStatus.skipped,
                undefined,
                {
                  name: fixture.name,
                  externalId: fixture.externalId,
                  reason: "invalid-state-transition",
                  action: "skip",
                }
              );
              return { success: false, fixture, action, skipped: true };
            }

            const leagueId =
              payload.leagueExternalId != null
                ? (leagueMap.get(String(payload.leagueExternalId)) ?? null)
                : null;

            const seasonId =
              payload.seasonExternalId != null
                ? (seasonMap.get(String(payload.seasonExternalId)) ?? null)
                : null;

            const homeTeamId = teamMap.get(String(payload.homeTeamExternalId));
            if (!homeTeamId) {
              throw new Error(
                `Home team not found (externalId: ${payload.homeTeamExternalId})`
              );
            }

            const awayTeamId = teamMap.get(String(payload.awayTeamExternalId));
            if (!awayTeamId) {
              throw new Error(
                `Away team not found (externalId: ${payload.awayTeamExternalId})`
              );
            }

            const updatePayload = {
              name: payload.name,
              leagueId: leagueId ?? null,
              seasonId: seasonId ?? null,
              homeTeamId,
              awayTeamId,
              startIso: payload.startIso,
              startTs: payload.startTs,
              state: payload.state,
              result: payload.result,
              homeScore: payload.homeScore,
              awayScore: payload.awayScore,
              stage: payload.stage,
              round: payload.round,
              updatedAt: new Date(),
            };
            const createPayload = {
              externalId: safeBigInt(payload.externalId),
              name: payload.name,
              leagueId: leagueId ?? null,
              seasonId: seasonId ?? null,
              homeTeamId,
              awayTeamId,
              startIso: payload.startIso,
              startTs: payload.startTs,
              state: payload.state,
              result: payload.result,
              homeScore: payload.homeScore,
              awayScore: payload.awayScore,
              stage: payload.stage,
              round: payload.round,
            };
            await prisma.fixtures.upsert({
              where: { externalId: safeBigInt(payload.externalId) },
              update: updatePayload as any,
              create: createPayload as any,
            });

            await trackSeedItem(
              batchId!,
              String(fixture.externalId),
              RunStatus.success,
              undefined,
              {
                name: fixture.name,
                externalId: fixture.externalId,
                action,
              }
            );

            return { success: true, fixture, action };
          } catch (e: any) {
            const extIdKey = String(safeBigInt(fixture.externalId));
            const action = existingSet.has(extIdKey) ? "update" : "insert";
            const errorCode = e?.code || "UNKNOWN_ERROR";
            const errorMessage = e?.message || "Unknown error";

            await trackSeedItem(
              batchId!,
              String(fixture.externalId),
              RunStatus.failed,
              errorMessage.slice(0, 500),
              {
                name: fixture.name,
                externalId: fixture.externalId,
                errorCode,
                errorMessage: errorMessage.slice(0, 200),
                action,
              }
            );

            console.log(
              `❌ [${batchId}] Fixture failed: ${fixture.name} (ID: ${fixture.externalId}) - ${errorMessage}`
            );

            return { success: false, fixture, error: errorMessage, action };
          }
        })
      );

      // Count successes, failures, and skips from this chunk
      for (const result of chunkResults) {
        if (result.status === "fulfilled") {
          if (result.value.success) {
            ok++;
            if (result.value.action === "insert") inserted++;
            else if (result.value.action === "update") updated++;
          } else if ("skipped" in result.value && result.value.skipped) {
            skipped++;
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
      meta: { ok, fail, inserted, updated, skipped },
    });

    let firstError: string | undefined;
    if (fail > 0 && batchId) {
      const failedItem = await prisma.seedItems.findFirst({
        where: { batchId, status: RunStatus.failed },
        select: { errorMessage: true, meta: true },
      });
      if (failedItem?.errorMessage) {
        const meta = failedItem.meta as { errorCode?: string; errorMessage?: string } | null;
        firstError = meta?.errorMessage ?? failedItem.errorMessage;
        if (meta?.errorCode) firstError = `[${meta.errorCode}] ${firstError}`;
      }
    }

    console.log(
      `🎉 [${batchId}] Fixtures seeding completed: ${ok} success, ${fail} failed`
    );
    return {
      batchId,
      ok,
      fail,
      total: ok + fail,
      inserted,
      updated,
      skipped,
      ...(firstError && { firstError }),
    };
  } catch (e: any) {
    console.log(
      `💥 [${batchId}] Unexpected error during fixtures seeding: ${
        e?.message || "Unknown error"
      }`
    );
    await finishSeedBatch(batchId!, RunStatus.failed, {
      itemsTotal: ok + fail,
      itemsSuccess: ok,
      itemsFailed: fail,
      errorMessage: String(e?.message ?? e).slice(0, 500),
      meta: { ok, fail, inserted, updated, skipped },
    });

    return {
      batchId,
      ok,
      fail,
      total: ok + fail,
      inserted,
      updated,
      skipped,
      firstError: String(e?.message ?? e).slice(0, 500),
    };
  }
}
