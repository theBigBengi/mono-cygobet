// teams/service.ts
// API service for teams (get teams list).

import type { ApiTeamsResponse } from "@repo/types";
import { buildTeamsWhere } from "./queries";
import { findTeams, countTeams } from "./repository";
import { buildTeamItem } from "./builders";

/** Team IDs to show when preset="popular". */
const POPULAR_TEAM_IDS = [35, 37, 1, 22, 36];

/**
 * Get paginated list of teams for pool creation.
 * Supports optional filtering by leagueId.
 * Supports optional search by team name.
 * Supports preset="popular" to return teams by fixed IDs from DB.
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
  const {
    page,
    perPage,
    leagueId,
    includeCountry = false,
    search,
    preset,
  } = args;

  const skip = (page - 1) * perPage;
  const take = perPage;

  const where =
    preset === "popular"
      ? { id: { in: POPULAR_TEAM_IDS } }
      : buildTeamsWhere({ leagueId, search });

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
