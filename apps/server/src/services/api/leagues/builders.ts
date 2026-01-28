// leagues/builders.ts
// DTO builders for leagues - transform Prisma data to API format.

import type { ApiLeagueItem, ApiSeasonItem } from "@repo/types";
import type { Prisma } from "@repo/db";
import { LEAGUE_SELECT_BASE, LEAGUE_SELECT_WITH_SEASONS } from "./selects";

type LeagueBase = Prisma.leaguesGetPayload<{ select: typeof LEAGUE_SELECT_BASE }>;
type LeagueWithSeasons = Prisma.leaguesGetPayload<{ select: typeof LEAGUE_SELECT_WITH_SEASONS }>;

/**
 * Build league item from Prisma data to API format.
 */
export function buildLeagueItem(
  league: LeagueBase | LeagueWithSeasons,
  includeSeasons: boolean
): ApiLeagueItem {
  const item: ApiLeagueItem = {
    id: league.id,
    name: league.name,
    imagePath: league.imagePath ?? null,
    countryId: league.countryId,
    type: league.type,
    shortCode: league.shortCode ?? null,
  };

  if (includeSeasons && "seasons" in league && league.seasons) {
    item.seasons = league.seasons.map(
      (season): ApiSeasonItem => ({
        id: season.id,
        name: season.name,
        startDate: season.startDate,
        endDate: season.endDate,
        isCurrent: season.isCurrent,
        leagueId: season.leagueId,
      })
    );
  }

  return item;
}
