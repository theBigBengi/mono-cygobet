// teams/queries.ts
// Query layer for teams - pure functions that build Prisma where conditions.
// NO Prisma client imports, NO database calls, NO side effects.

import type { Prisma } from "@repo/db";

/**
 * Build where condition for teams query.
 * Supports filtering by leagueId and search by team name.
 */
export function buildTeamsWhere(params: {
  leagueId?: number;
  search?: string;
}): Prisma.teamsWhereInput {
  const { leagueId, search } = params;
  const where: Prisma.teamsWhereInput = {};
  const andConditions: Prisma.teamsWhereInput[] = [];

  // Filter by league - teams that appear in fixtures for this league (as home or away team)
  if (leagueId !== undefined) {
    andConditions.push({
      OR: [
        {
          fixtures_fixtures_home_team_idToteams: {
            some: { leagueId: leagueId },
          },
        },
        {
          fixtures_fixtures_away_team_idToteams: {
            some: { leagueId: leagueId },
          },
        },
      ],
    });
  }

  // Search by team name (case-insensitive)
  if (search && search.trim()) {
    andConditions.push({
      OR: [
        { name: { contains: search.trim(), mode: "insensitive" } },
        { shortCode: { contains: search.trim(), mode: "insensitive" } },
      ],
    });
  }

  // Combine all conditions with AND
  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  return where;
}
