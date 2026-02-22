// fixtures/queries.ts
// Query layer for fixtures - pure functions that build Prisma where conditions.
// NO Prisma client imports, NO database calls, NO side effects.

import type { Prisma } from "@repo/db";
import { FixtureState } from "@repo/db";

/**
 * Build base upcoming fixtures where condition.
 * Handles both time range patterns:
 * - `startTs: { gt: now }` when only `now` is provided
 * - `startTs: { gte: fromTs, lte: toTs }` when `fromTs` and `toTs` are provided
 */
export function buildUpcomingFixturesWhere(params: {
  fromTs?: number;
  toTs?: number;
  now?: number;
  state?: typeof FixtureState.NS;
}): Prisma.fixturesWhereInput {
  const { fromTs, toTs, now, state = FixtureState.NS } = params;

  const where: Prisma.fixturesWhereInput = {
    state,
    externalId: { gte: "0" },
    leagueId: { not: null },
  };

  // Handle time range: prefer range (fromTs/toTs) over single point (now)
  if (fromTs !== undefined && toTs !== undefined) {
    where.startTs = { gte: fromTs, lte: toTs };
  } else if (now !== undefined) {
    where.startTs = { gt: now };
  }

  return where;
}

/**
 * Add league filter to existing where condition.
 */
export function buildFixturesByLeaguesWhere(
  baseWhere: Prisma.fixturesWhereInput,
  leagueIds: number[]
): Prisma.fixturesWhereInput {
  if (leagueIds.length === 0) {
    return baseWhere;
  }

  return {
    ...baseWhere,
    leagueId: { in: leagueIds },
  };
}

/**
 * Add team filter to existing where condition.
 */
export function buildFixturesByTeamsWhere(
  baseWhere: Prisma.fixturesWhereInput,
  teamIds: number[]
): Prisma.fixturesWhereInput {
  if (teamIds.length === 0) {
    return baseWhere;
  }

  return {
    ...baseWhere,
    OR: [{ homeTeamId: { in: teamIds } }, { awayTeamId: { in: teamIds } }],
  };
}

/**
 * Add hasOdds filter to existing where condition.
 */
export function buildFixturesWithOddsWhere(
  baseWhere: Prisma.fixturesWhereInput
): Prisma.fixturesWhereInput {
  return {
    ...baseWhere,
    hasOdds: true,
  };
}
