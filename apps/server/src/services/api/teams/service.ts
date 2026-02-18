// teams/service.ts
// API service for teams (get teams list).

import type { ApiTeamsResponse } from "@repo/types";
import { buildTeamsWhere } from "./queries";
import { findTeams, countTeams } from "./repository";
import { buildTeamItem } from "./builders";
import { getTeamOrderSettings } from "../../admin/settings.service";


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

  // Get popular team IDs from admin settings
  let popularIds: number[] = [];
  if (preset === "popular") {
    const adminSettings = await getTeamOrderSettings();
    if (adminSettings.defaultTeamOrder && adminSettings.defaultTeamOrder.length > 0) {
      popularIds = adminSettings.defaultTeamOrder;
    }
  }

  const where =
    preset === "popular"
      ? { id: { in: popularIds } }
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
