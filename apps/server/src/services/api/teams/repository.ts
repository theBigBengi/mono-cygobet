// teams/repository.ts
// Repository layer for teams - team-related database queries.
// Receives pre-built where conditions, does NOT build them.

import { prisma } from "@repo/db";
import type { Prisma } from "@repo/db";
import { TEAM_SELECT_BASE, TEAM_SELECT_WITH_COUNTRY } from "./selects";

/**
 * Find teams by where condition.
 */
export async function findTeams(
  where: Prisma.teamsWhereInput,
  includeCountry: boolean,
  orderBy?: Prisma.teamsOrderByWithRelationInput,
  take?: number,
  skip?: number
) {
  return await prisma.teams.findMany({
    where,
    select: includeCountry ? TEAM_SELECT_WITH_COUNTRY : TEAM_SELECT_BASE,
    orderBy: orderBy ?? { name: "asc" },
    take,
    skip,
  });
}

/**
 * Count teams by where condition.
 */
export async function countTeams(where: Prisma.teamsWhereInput) {
  return await prisma.teams.count({ where });
}
