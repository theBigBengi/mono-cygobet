// leagues/service.ts
// API service for leagues (get leagues list).

import type { ApiLeaguesResponse } from "@repo/types";
import { buildLeaguesWhere } from "./queries";
import { findLeagues, countLeagues } from "./repository";
import { buildLeagueItem } from "./builders";

/** League IDs to show when preset="popular". */
const POPULAR_LEAGUE_IDS = [1, 5];

/**
 * Get paginated list of leagues for pool creation.
 * Returns minimal fields needed for UI.
 * Optionally includes seasons when includeSeasons is true.
 * Optionally filters to only leagues with active seasons when onlyActiveSeasons is true.
 * Supports preset="popular" to return leagues by fixed IDs from DB.
 * Supports optional search by league name.
 */
export async function getLeagues(args: {
  page: number;
  perPage: number;
  includeSeasons?: boolean;
  onlyActiveSeasons?: boolean;
  preset?: "popular";
  search?: string;
}): Promise<ApiLeaguesResponse> {
  const {
    page,
    perPage,
    includeSeasons = false,
    onlyActiveSeasons = false,
    preset,
    search,
  } = args;

  const skip = (page - 1) * perPage;
  const take = perPage;

  const where =
    preset === "popular"
      ? { id: { in: POPULAR_LEAGUE_IDS } }
      : buildLeaguesWhere({ onlyActiveSeasons, search });

  const effectiveOnlyActive = preset === "popular" ? false : onlyActiveSeasons;

  const [leagues, count] = await Promise.all([
    findLeagues(
      where,
      includeSeasons,
      effectiveOnlyActive,
      { name: "asc" },
      take,
      skip
    ),
    countLeagues(where),
  ]);

  const data = leagues.map((league) => buildLeagueItem(league, includeSeasons));
  const totalPages = Math.ceil(count / perPage);

  return {
    status: "success",
    data,
    pagination: {
      page,
      perPage,
      totalItems: count,
      totalPages,
      pageCount: leagues.length,
      hasMore: count > page * perPage,
    },
    message: "Leagues fetched successfully",
  };
}
