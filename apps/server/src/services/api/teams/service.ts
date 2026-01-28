// teams/service.ts
// API service for teams (get teams list).

import type { ApiTeamsResponse, ApiTeamItem } from "@repo/types";
import { buildTeamsWhere } from "./queries";
import { findTeams, countTeams } from "./repository";
import { buildTeamItem } from "./builders";

/**
 * Mock popular teams data.
 * Returns 10 popular teams for the preset="popular" query.
 */
function getPopularTeams(): ApiTeamItem[] {
  return [
    { id: 1, name: "Real Madrid", imagePath: null, countryId: null, shortCode: "RMA" },
    { id: 2, name: "Barcelona", imagePath: null, countryId: null, shortCode: "BAR" },
    { id: 3, name: "Manchester United", imagePath: null, countryId: null, shortCode: "MUN" },
    { id: 4, name: "Liverpool", imagePath: null, countryId: null, shortCode: "LIV" },
    { id: 5, name: "Bayern Munich", imagePath: null, countryId: null, shortCode: "BAY" },
    { id: 6, name: "Paris Saint-Germain", imagePath: null, countryId: null, shortCode: "PSG" },
    { id: 7, name: "Chelsea", imagePath: null, countryId: null, shortCode: "CHE" },
    { id: 8, name: "Arsenal", imagePath: null, countryId: null, shortCode: "ARS" },
    { id: 9, name: "Juventus", imagePath: null, countryId: null, shortCode: "JUV" },
    { id: 10, name: "AC Milan", imagePath: null, countryId: null, shortCode: "ACM" },
  ];
}

/**
 * Get paginated list of teams for pool creation.
 * Supports optional filtering by leagueId.
 * Supports optional search by team name.
 * Supports preset="popular" to return popular teams (mock data).
 * Optionally includes country when includeCountry is true.
 * Returns minimal fields needed for UI.
 */
export async function getTeams(args: {
  page: number;
  perPage: number;
  leagueId?: number;
  includeCountry?: boolean;
  search?: string;
  preset?: "popular";
}): Promise<ApiTeamsResponse> {
  const { page, perPage, leagueId, includeCountry = false, search, preset } = args;

  // If preset is "popular", return mock data immediately (bypass database query)
  if (preset === "popular") {
    const allPopularTeams = getPopularTeams();
    const skip = (page - 1) * perPage;
    const take = perPage;
    const paginatedTeams = allPopularTeams.slice(skip, skip + take);
    const totalItems = allPopularTeams.length;
    const totalPages = Math.ceil(totalItems / perPage);

    return {
      status: "success",
      data: paginatedTeams,
      pagination: {
        page,
        perPage,
        totalItems,
        totalPages,
        pageCount: paginatedTeams.length,
        hasMore: totalItems > page * perPage,
      },
      message: "Popular teams fetched successfully",
    };
  }

  // Continue with existing database query logic
  const skip = (page - 1) * perPage;
  const take = perPage;

  const where = buildTeamsWhere({ leagueId, search });

  const [teams, count] = await Promise.all([
    findTeams(where, includeCountry, { name: "asc" }, take, skip),
    countTeams(where),
  ]);

  const data = teams.map((team) => buildTeamItem(team, includeCountry));
  const totalPages = Math.ceil(count / perPage);

  return {
    status: "success",
    data,
    pagination: {
      page,
      perPage,
      totalItems: count,
      totalPages,
      pageCount: teams.length,
      hasMore: count > page * perPage,
    },
    message: "Teams fetched successfully",
  };
}
