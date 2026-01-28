// leagues/queries.ts
// Query layer for leagues - pure functions that build Prisma where conditions.
// NO Prisma client imports, NO database calls, NO side effects.

import type { Prisma } from "@repo/db";

/**
 * Build where condition for leagues query.
 * Supports filtering to only leagues with active seasons.
 * Supports search by league name.
 */
export function buildLeaguesWhere(params: {
  onlyActiveSeasons?: boolean;
  search?: string;
}): Prisma.leaguesWhereInput {
  const { onlyActiveSeasons = false, search } = params;
  const where: Prisma.leaguesWhereInput = {};
  const andConditions: Prisma.leaguesWhereInput[] = [];

  // Filter to only leagues with active seasons (isCurrent: true)
  if (onlyActiveSeasons) {
    andConditions.push({
      seasons: {
        some: {
          isCurrent: true,
        },
      },
    });
  }

  // Search by league name (case-insensitive)
  if (search && search.trim()) {
    andConditions.push({
      name: { contains: search.trim(), mode: "insensitive" },
    });
  }

  // Combine all conditions with AND
  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  return where;
}
