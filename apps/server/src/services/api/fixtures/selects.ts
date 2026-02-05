// fixtures/selects.ts
// Select layer for fixtures - defines which fields/relations to fetch from DB.
// NO where conditions, NO DTO formatting, NO business logic.

import type { Prisma } from "@repo/db";

// Base select (matches buildFixtureSelect(false))
export const FIXTURE_SELECT_BASE = {
  id: true,
  name: true,
  startIso: true,
  startTs: true,
  state: true,
  liveMinute: true,
  stage: true,
  round: true,
  league: {
    select: {
      id: true,
      name: true,
      imagePath: true,
      country: {
        select: {
          id: true,
          name: true,
          imagePath: true,
        },
      },
    },
  },
  homeTeam: {
    select: {
      id: true,
      name: true,
      imagePath: true,
      firstKitColor: true,
      secondKitColor: true,
      thirdKitColor: true,
    },
  },
  awayTeam: {
    select: {
      id: true,
      name: true,
      imagePath: true,
      firstKitColor: true,
      secondKitColor: true,
      thirdKitColor: true,
    },
  },
} as const satisfies Prisma.fixturesSelect;

export const FIXTURE_SELECT_WITH_RESULT = {
  ...FIXTURE_SELECT_BASE,
  result: true,
  homeScore90: true,
  awayScore90: true,
} as const satisfies Prisma.fixturesSelect;

/** Full fixture select for detail endpoint: base + result + period scores. */
export const FIXTURE_SELECT_DETAIL = {
  ...FIXTURE_SELECT_BASE,
  result: true,
  homeScore90: true,
  awayScore90: true,
  homeScoreET: true,
  awayScoreET: true,
  penHome: true,
  penAway: true,
} as const satisfies Prisma.fixturesSelect;

/**
 * Build a Prisma select object for fixtures with relations.
 * Used to ensure consistent fixture selection across queries.
 *
 * @param includeResult - Whether to include the result field (default: false)
 * @returns Prisma select object for fixtures
 */
export function buildFixtureSelect(
  includeResult = false
): Prisma.fixturesSelect {
  return includeResult ? FIXTURE_SELECT_WITH_RESULT : FIXTURE_SELECT_BASE;
}
