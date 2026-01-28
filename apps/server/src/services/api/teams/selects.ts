// teams/selects.ts
// Select layer for teams - defines which fields/relations to fetch from DB.
// NO where conditions, NO DTO formatting, NO business logic.

import type { Prisma } from "@repo/db";

// Base select (minimal fields needed for UI)
export const TEAM_SELECT_BASE = {
  id: true,
  name: true,
  imagePath: true,
  countryId: true,
  shortCode: true,
} as const satisfies Prisma.teamsSelect;

// Select with country relation
export const TEAM_SELECT_WITH_COUNTRY = {
  ...TEAM_SELECT_BASE,
  countries: {
    select: {
      id: true,
      name: true,
      imagePath: true,
    },
  },
} as const satisfies Prisma.teamsSelect;
