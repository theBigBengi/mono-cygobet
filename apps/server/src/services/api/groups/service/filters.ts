// groups/service/filters.ts
// Group games filters service.

import type {
  ApiGroupGamesFiltersResponse,
  ApiGroupGamesFiltersData,
  ApiGroupGamesFiltersLeagueItem,
} from "@repo/types";
import { SELECTION_MODE } from "../constants";
import { assertGroupMember } from "../permissions";
import { repository as repo } from "../repository";

/**
 * Get games-filters (rounds as raw strings, leagues) for a group.
 * - Verifies that the user is the creator or a member.
 * - Returns filters based on selectionMode: leagues mode has rounds, teams/games mode has empty filters.
 * - Returns leagues with currentSeason for filtering.
 */
export async function getGroupGamesFilters(
  groupId: number,
  userId: number
): Promise<ApiGroupGamesFiltersResponse> {
  const { group } = await assertGroupMember(groupId, userId);

  const groupRules = await repo.findGroupRules(groupId);

  const mode = groupRules?.selectionMode || SELECTION_MODE.GAMES;

  // Get all fixtures for this group
  const groupFixtures = await repo.findGroupFixturesForFilters(groupId);

  // Extract unique leagues with currentSeason
  const leagueMap = new Map<number, ApiGroupGamesFiltersLeagueItem>();

  for (const { fixtures } of groupFixtures) {
    if (fixtures.league && fixtures.league.seasons.length > 0) {
      const leagueId = fixtures.league.id;
      if (!leagueMap.has(leagueId)) {
        leagueMap.set(leagueId, {
          id: fixtures.league.id,
          name: fixtures.league.name,
          imagePath: fixtures.league.imagePath,
          country: fixtures.league.country
            ? {
                id: fixtures.league.country.id,
                name: fixtures.league.country.name,
                imagePath: fixtures.league.country.imagePath,
              }
            : null,
        });
      }
    }
  }

  const leagues: ApiGroupGamesFiltersLeagueItem[] = Array.from(leagueMap.values()).sort(
    (a, b) => a.name.localeCompare(b.name)
  );

  // Build filters based on mode
  let filters: ApiGroupGamesFiltersData["filters"];

  if (mode === SELECTION_MODE.LEAGUES) {
    // Extract unique rounds
    const roundsSet = new Set<string>();
    for (const { fixtures } of groupFixtures) {
      if (fixtures.round) {
        roundsSet.add(fixtures.round);
      }
    }

    const rounds = Array.from(roundsSet).sort();
    filters = {
      primary: "round",
      rounds,
    };
  } else {
    // Teams or games mode: empty filters
    filters = {};
  }

  const data: ApiGroupGamesFiltersData = {
    mode,
    filters,
    leagues,
  };

  return {
    status: "success",
    data,
    message: "Games filters retrieved successfully",
  };
}
