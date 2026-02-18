// leagues/service.ts
// API service for leagues (get leagues list).

import type { ApiLeaguesResponse } from "@repo/types";
import { buildLeaguesWhere } from "./queries";
import { findLeagues, countLeagues } from "./repository";
import { buildLeagueItem } from "./builders";
import { getLeagueOrderSettings } from "../../admin/settings.service";

/** Fallback league IDs if admin hasn't configured any. */
const FALLBACK_POPULAR_IDS = [1, 5];

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
  includeCountry?: boolean;
  preset?: "popular";
  search?: string;
}): Promise<ApiLeaguesResponse> {
  const {
    page,
    perPage,
    includeSeasons = false,
    onlyActiveSeasons = false,
    includeCountry = false,
    preset,
    search,
  } = args;

  const skip = (page - 1) * perPage;
  const take = perPage;

  // Get popular league IDs from admin settings (or fallback)
  let popularIds: number[] = FALLBACK_POPULAR_IDS;
  if (preset === "popular") {
    const adminSettings = await getLeagueOrderSettings();
    if (adminSettings.defaultLeagueOrder && adminSettings.defaultLeagueOrder.length > 0) {
      popularIds = adminSettings.defaultLeagueOrder;
    }
  }

  const where =
    preset === "popular"
      ? { id: { in: popularIds } }
      : buildLeaguesWhere({ onlyActiveSeasons, search });

  const effectiveOnlyActive = preset === "popular" ? false : onlyActiveSeasons;

  const [leagues, count] = await Promise.all([
    findLeagues(
      where,
      includeSeasons,
      effectiveOnlyActive,
      includeCountry,
      { name: "asc" },
      take,
      skip
    ),
    countLeagues(where),
  ]);

  const data = leagues.map((league) =>
    buildLeagueItem(league, includeSeasons, includeCountry)
  );
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
