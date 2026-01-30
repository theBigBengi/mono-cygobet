/**
 * Sync layer for fixtures: incremental updates only. No seedBatches/seedItems.
 * Caller is responsible for fetch; sync receives DTOs and writes (or skips) based on comparison.
 */
import type { FixtureDTO } from "@repo/types/sport-data/common";
import { FixtureState, prisma } from "@repo/db";
import {
  transformFixtureDto,
  isValidFixtureStateTransition,
} from "../transform/fixtures.transform";
import { chunk, safeBigInt } from "../utils";
import { getLogger } from "../../logger";

type DbFixtureState = (typeof FixtureState)[keyof typeof FixtureState];

const log = getLogger("SyncFixtures");
const CHUNK_SIZE = 8;

export type SyncFixturesResult = {
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  total: number;
};

type ExistingRow = {
  externalId: bigint;
  name: string;
  leagueId: number | null;
  seasonId: number | null;
  homeTeamId: number;
  awayTeamId: number;
  startIso: string;
  startTs: number;
  state: DbFixtureState;
  result: string | null;
  homeScore: number | null;
  awayScore: number | null;
  stage: string | null;
  round: string | null;
};

function isSameFixture(
  existing: ExistingRow,
  payload: {
    name: string;
    leagueId: number | null;
    seasonId: number | null;
    homeTeamId: number;
    awayTeamId: number;
    startIso: string;
    startTs: number;
    state: DbFixtureState;
    result: string | null;
    homeScore: number | null;
    awayScore: number | null;
    stage: string | null;
    round: string | null;
  }
): boolean {
  return (
    existing.name === payload.name &&
    existing.leagueId === payload.leagueId &&
    existing.seasonId === payload.seasonId &&
    existing.homeTeamId === payload.homeTeamId &&
    existing.awayTeamId === payload.awayTeamId &&
    existing.startIso === payload.startIso &&
    existing.startTs === payload.startTs &&
    existing.state === payload.state &&
    existing.result === payload.result &&
    existing.homeScore === payload.homeScore &&
    existing.awayScore === payload.awayScore &&
    existing.stage === payload.stage &&
    existing.round === payload.round
  );
}

/**
 * Sync fixtures: transform, resolve FKs, compare with DB, then insert/update/skip.
 * No fetch; no seedBatches/seedItems.
 */
export async function syncFixtures(
  fixtures: FixtureDTO[],
  opts?: { dryRun?: boolean }
): Promise<SyncFixturesResult> {
  const dryRun = !!opts?.dryRun;
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  if (!fixtures?.length) {
    return { inserted: 0, updated: 0, skipped: 0, failed: 0, total: 0 };
  }

  // De-dupe by externalId
  const seen = new Set<string>();
  const uniqueFixtures: FixtureDTO[] = [];
  for (const f of fixtures) {
    const key = String(f.externalId);
    if (seen.has(key)) skipped += 1;
    else {
      seen.add(key);
      uniqueFixtures.push(f);
    }
  }

  // Batch resolve leagues, seasons, teams
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
  }

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
  }

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
  }

  for (const group of chunk(uniqueFixtures, CHUNK_SIZE)) {
    const groupExternalIds = group.map((f) => safeBigInt(f.externalId));
    const existingRows = await prisma.fixtures.findMany({
      where: { externalId: { in: groupExternalIds } },
      select: {
        externalId: true,
        name: true,
        leagueId: true,
        seasonId: true,
        homeTeamId: true,
        awayTeamId: true,
        startIso: true,
        startTs: true,
        state: true,
        result: true,
        homeScore: true,
        awayScore: true,
        stage: true,
        round: true,
      },
    });
    const existingByExtId = new Map(
      existingRows.map((r) => [String(r.externalId), r as ExistingRow])
    );

    const results = await Promise.allSettled(
      group.map(async (fixture) => {
        const extIdKey = String(safeBigInt(fixture.externalId));
        const existing = existingByExtId.get(extIdKey);

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
        const leagueId =
          payload.leagueExternalId != null
            ? leagueMap.get(String(payload.leagueExternalId)) ?? null
            : null;
        const seasonId =
          payload.seasonExternalId != null
            ? seasonMap.get(String(payload.seasonExternalId)) ?? null
            : null;
        const homeTeamId = teamMap.get(String(payload.homeTeamExternalId));
        const awayTeamId = teamMap.get(String(payload.awayTeamExternalId));

        if (!homeTeamId) {
          throw new Error(
            `Home team not found (externalId: ${payload.homeTeamExternalId})`
          );
        }
        if (!awayTeamId) {
          throw new Error(
            `Away team not found (externalId: ${payload.awayTeamExternalId})`
          );
        }

        const resolvedPayload = {
          name: payload.name,
          leagueId,
          seasonId,
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

        // State validation: disallow invalid transitions
        if (existing && !isValidFixtureStateTransition(existing.state, payload.state)) {
          log.warn(
            { externalId: fixture.externalId, current: existing.state, next: payload.state },
            "Invalid fixture state transition; skipping update"
          );
          return "skipped" as const;
        }

        if (!existing) {
          if (!dryRun) {
            await prisma.fixtures.upsert({
              where: { externalId: safeBigInt(payload.externalId) },
              create: {
                externalId: safeBigInt(payload.externalId),
                ...resolvedPayload,
              },
              update: {
                ...resolvedPayload,
                updatedAt: new Date(),
              },
            });
          }
          return "inserted" as const;
        }

        if (isSameFixture(existing, resolvedPayload)) {
          return "skipped" as const;
        }

        if (!dryRun) {
          await prisma.fixtures.upsert({
            where: { externalId: safeBigInt(payload.externalId) },
            create: {
              externalId: safeBigInt(payload.externalId),
              ...resolvedPayload,
            },
            update: {
              ...resolvedPayload,
              updatedAt: new Date(),
            },
          });
        }
        return "updated" as const;
      })
    );

    for (let i = 0; i < results.length; i++) {
      const r = results[i]!;
      const fixture = group[i]!;
      if (r.status === "fulfilled") {
        switch (r.value) {
          case "inserted":
            inserted += 1;
            break;
          case "updated":
            updated += 1;
            break;
          case "skipped":
            skipped += 1;
            break;
        }
      } else {
        log.warn(
          { externalId: fixture.externalId, error: r.reason },
          "Fixture sync failed (Promise rejected)"
        );
        failed += 1;
      }
    }
  }

  return {
    inserted,
    updated,
    skipped,
    failed,
    total: inserted + updated + skipped + failed,
  };
}
