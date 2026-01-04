// src/etl/seeds/seed.fixtures.ts
import type { FixtureDTO } from "@repo/types/sport-data/common";
import {
  startSeedBatch,
  trackSeedItem,
  finishSeedBatch,
  chunk,
  safeBigInt,
} from "./seed.utils";
import {
  FixtureState as DbFixtureState,
  RunStatus,
  RunTrigger,
  prisma,
} from "@repo/db";

const CHUNK_SIZE = 8;

function coerceDbFixtureState(state: FixtureDTO["state"]): DbFixtureState {
  // `FixtureDTO.state` is from `@repo/types` (string union).
  // Prisma expects its own `FixtureState` type; values are the same (e.g. "NS", "LIVE", ...).
  return state as unknown as DbFixtureState;
}

// Helper to parse scores from result string (e.g., "2-1" -> { home: 2, away: 1 })
function parseScores(result: string | null | undefined): {
  homeScore: number | null;
  awayScore: number | null;
} {
  if (!result) return { homeScore: null, awayScore: null };

  const match = result.match(/^(\d+)-(\d+)$/);
  if (match && match[1] && match[2]) {
    return {
      homeScore: parseInt(match[1], 10),
      awayScore: parseInt(match[2], 10),
    };
  }

  return { homeScore: null, awayScore: null };
}

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
) {
  // In dry-run mode, skip all database writes including batch tracking
  if (opts?.dryRun) {
    console.log(
      `🧪 DRY RUN MODE: ${fixtures?.length ?? 0} fixtures would be processed (no database changes)`
    );
    return { batchId: null, ok: 0, fail: 0, total: fixtures?.length ?? 0 };
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
    return { batchId, ok: 0, fail: 0, total: 0 };
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

  try {
    for (const group of chunk(uniqueFixtures, CHUNK_SIZE)) {
      // Process all fixtures in the chunk in parallel
      const chunkResults = await Promise.allSettled(
        group.map(async (fixture) => {
          try {
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

            const leagueId =
              fixture.leagueExternalId != null
                ? (leagueMap.get(String(fixture.leagueExternalId)) ?? null)
                : null;

            const seasonId =
              fixture.seasonExternalId != null
                ? (seasonMap.get(String(fixture.seasonExternalId)) ?? null)
                : null;

            const homeTeamId = teamMap.get(String(fixture.homeTeamExternalId));
            if (!homeTeamId) {
              throw new Error(
                `Home team not found (externalId: ${fixture.homeTeamExternalId})`
              );
            }

            const awayTeamId = teamMap.get(String(fixture.awayTeamExternalId));
            if (!awayTeamId) {
              throw new Error(
                `Away team not found (externalId: ${fixture.awayTeamExternalId})`
              );
            }

            // Derive startIso from startTs (Unix seconds)
            const startIso = new Date(fixture.startTs * 1000).toISOString();

            // Parse scores from result string
            const { homeScore, awayScore } = parseScores(fixture.result);
            const dbState = coerceDbFixtureState(fixture.state);

            // Upsert fixture: update if exists, create if not
            await prisma.fixtures.upsert({
              where: { externalId: safeBigInt(fixture.externalId) },
              update: {
                name: fixture.name,
                leagueId: leagueId ?? null,
                seasonId: seasonId ?? null,
                homeTeamId,
                awayTeamId,
                startIso,
                startTs: fixture.startTs,
                state: dbState,
                result: fixture.result ?? null,
                homeScore: homeScore ?? null,
                awayScore: awayScore ?? null,
                stageRoundName: fixture.stageRoundName ?? null,
                updatedAt: new Date(),
              },
              create: {
                externalId: safeBigInt(fixture.externalId),
                name: fixture.name,
                leagueId: leagueId ?? null,
                seasonId: seasonId ?? null,
                homeTeamId,
                awayTeamId,
                startIso,
                startTs: fixture.startTs,
                state: dbState,
                result: fixture.result ?? null,
                homeScore: homeScore ?? null,
                awayScore: awayScore ?? null,
                stageRoundName: fixture.stageRoundName ?? null,
              },
            });

            await trackSeedItem(
              batchId!,
              String(fixture.externalId),
              RunStatus.success,
              undefined,
              {
                name: fixture.name,
                externalId: fixture.externalId,
              }
            );

            return { success: true, fixture };
          } catch (e: any) {
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
              }
            );

            console.log(
              `❌ [${batchId}] Fixture failed: ${fixture.name} (ID: ${fixture.externalId}) - ${errorMessage}`
            );

            return { success: false, fixture, error: errorMessage };
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
      `🎉 [${batchId}] Fixtures seeding completed: ${ok} success, ${fail} failed`
    );
    return { batchId, ok, fail, total: ok + fail };
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
      meta: { ok, fail },
    });

    return { batchId, ok, fail, total: ok + fail };
  }
}
