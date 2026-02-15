// leagues/selects.ts
// Select layer for leagues - defines which fields/relations to fetch from DB.
// NO where conditions, NO DTO formatting, NO business logic.

import type { Prisma } from "@repo/db";

// Base select (minimal fields needed for UI)
export const LEAGUE_SELECT_BASE = {
  id: true,
  name: true,
  imagePath: true,
  countryId: true,
  type: true,
  shortCode: true,
} as const satisfies Prisma.leaguesSelect;

// Select with seasons relation
export const LEAGUE_SELECT_WITH_SEASONS = {
  ...LEAGUE_SELECT_BASE,
  seasons: {
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      isCurrent: true,
      leagueId: true,
    },
    orderBy: { name: "asc" },
  },
} as const satisfies Prisma.leaguesSelect;

// Select with country relation
export const LEAGUE_SELECT_WITH_COUNTRY = {
  ...LEAGUE_SELECT_BASE,
  country: {
    select: { id: true, name: true, imagePath: true, iso2: true },
  },
} as const satisfies Prisma.leaguesSelect;

// Select with seasons and country
export const LEAGUE_SELECT_WITH_SEASONS_AND_COUNTRY = {
  ...LEAGUE_SELECT_BASE,
  country: {
    select: { id: true, name: true, imagePath: true, iso2: true },
  },
  seasons: {
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      isCurrent: true,
      leagueId: true,
    },
    orderBy: { name: "asc" },
  },
} as const satisfies Prisma.leaguesSelect;
