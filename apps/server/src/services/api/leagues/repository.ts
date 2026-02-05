// leagues/repository.ts
// Repository layer for leagues - league-related database queries.
// Receives pre-built where conditions, does NOT build them.

import { prisma } from "@repo/db";
import type { Prisma } from "@repo/db";
import {
  LEAGUE_SELECT_BASE,
  LEAGUE_SELECT_WITH_SEASONS,
  LEAGUE_SELECT_WITH_COUNTRY,
  LEAGUE_SELECT_WITH_SEASONS_AND_COUNTRY,
} from "./selects";

function getLeaguesSelect(
  includeSeasons: boolean,
  includeCountry: boolean
): Prisma.leaguesSelect {
  if (includeSeasons && includeCountry)
    return LEAGUE_SELECT_WITH_SEASONS_AND_COUNTRY;
  if (includeSeasons) return LEAGUE_SELECT_WITH_SEASONS;
  if (includeCountry) return LEAGUE_SELECT_WITH_COUNTRY;
  return LEAGUE_SELECT_BASE;
}

/**
 * Find leagues by where condition.
 */
export async function findLeagues(
  where: Prisma.leaguesWhereInput,
  includeSeasons: boolean,
  onlyActiveSeasons: boolean,
  includeCountry: boolean,
  orderBy?: Prisma.leaguesOrderByWithRelationInput,
  take?: number,
  skip?: number
) {
  const select = getLeaguesSelect(includeSeasons, includeCountry);

  // If including seasons and filtering to active only, override seasons with where
  if (includeSeasons && onlyActiveSeasons) {
    return await prisma.leagues.findMany({
      where,
      select: {
        ...select,
        seasons: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            isCurrent: true,
            leagueId: true,
          },
          where: {
            isCurrent: true,
          },
          orderBy: { name: "asc" },
        },
      },
      orderBy: orderBy ?? { name: "asc" },
      take,
      skip,
    });
  }

  return await prisma.leagues.findMany({
    where,
    select,
    orderBy: orderBy ?? { name: "asc" },
    take,
    skip,
  });
}

/**
 * Count leagues by where condition.
 */
export async function countLeagues(where: Prisma.leaguesWhereInput) {
  return await prisma.leagues.count({ where });
}
