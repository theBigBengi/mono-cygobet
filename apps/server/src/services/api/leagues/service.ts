// leagues/service.ts
// API service for leagues (get leagues list).

import type { ApiLeaguesResponse, ApiLeagueItem } from "@repo/types";
import { buildLeaguesWhere } from "./queries";
import { findLeagues, countLeagues } from "./repository";
import { buildLeagueItem } from "./builders";

/**
 * Mock popular leagues data.
 * Returns 5 popular leagues for the preset="popular" query.
 */
function getPopularLeagues(): ApiLeagueItem[] {
  return [
    { id: 1, name: "Premier League", imagePath: null, countryId: 1, type: "league", shortCode: "EPL" },
    { id: 2, name: "La Liga", imagePath: null, countryId: 2, type: "league", shortCode: "LL" },
    { id: 3, name: "Serie A", imagePath: null, countryId: 3, type: "league", shortCode: "SA" },
    { id: 4, name: "Bundesliga", imagePath: null, countryId: 4, type: "league", shortCode: "BL" },
    { id: 5, name: "Ligue 1", imagePath: null, countryId: 5, type: "league", shortCode: "L1" },
  ];
}

/**
 * Get paginated list of leagues for pool creation.
 * Returns minimal fields needed for UI.
 * Optionally includes seasons when includeSeasons is true.
 * Optionally filters to only leagues with active seasons when onlyActiveSeasons is true.
 * Supports preset="popular" to return popular leagues (mock data).
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

  // If preset is "popular", return mock data immediately (bypass database query)
  if (preset === "popular") {
    const allPopularLeagues = getPopularLeagues();
    const skip = (page - 1) * perPage;
    const take = perPage;
    const paginatedLeagues = allPopularLeagues.slice(skip, skip + take);
    const totalItems = allPopularLeagues.length;
    const totalPages = Math.ceil(totalItems / perPage);

    return {
      status: "success",
      data: paginatedLeagues,
      pagination: {
        page,
        perPage,
        totalItems,
        totalPages,
        pageCount: paginatedLeagues.length,
        hasMore: totalItems > page * perPage,
      },
      message: "Popular leagues fetched successfully",
    };
  }

  // Continue with existing database query logic
  const skip = (page - 1) * perPage;
  const take = perPage;

  const where = buildLeaguesWhere({ onlyActiveSeasons, search });

  const [leagues, count] = await Promise.all([
    findLeagues(where, includeSeasons, onlyActiveSeasons, { name: "asc" }, take, skip),
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
