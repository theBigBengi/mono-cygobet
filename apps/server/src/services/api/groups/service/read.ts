// groups/service/read.ts
// Read group services (getMyGroups, getGroupById, getGroupFixtures).

import type {
  ApiGroupItem,
  ApiGroupResponse,
  ApiGroupsResponse,
  ApiGroupFixturesResponse,
  ApiFixturesListResponse,
} from "@repo/types";
import { nowUnixSeconds } from "../../../../utils/dates";
import type { GroupFixturesFilter } from "../../../../types/groups";
import { applyGroupFixturesFilter } from "../fixtures-filter";
import { parsePrediction } from "../helpers";
import { GROUP_STATUS } from "../constants";
import {
  buildDraftGroupItem,
  buildActiveGroupItem,
  formatFixtureFromDb,
  buildGroupItem,
} from "../builders";
import { assertGroupMember } from "../permissions";
import {
  findGroupsByUserId,
  findGroupsStatsBatch,
  fetchGroupFixturesWithPredictions,
} from "../repository";
import type {
  FixtureWithRelationsAndResult,
} from "../types";

/**
 * Get all groups the user is a member of (as creator or joined member).
 * Sorted by createdAt DESC.
 * Includes memberCount and nextGame for each group.
 * 
 * Optimized with batch queries to avoid N+1 problem.
 */
export async function getMyGroups(
  userId: number
): Promise<ApiGroupsResponse> {
  // Find all groups where user is either creator or a joined member
  const groups = await findGroupsByUserId(userId);

  if (groups.length === 0) {
    return {
      status: "success",
      data: [],
      message: "Groups fetched successfully",
    };
  }

  const now = nowUnixSeconds();
  const groupIds = groups.map((g) => g.id);

  // Fetch all stats in batch (6 queries total instead of 5 per group)
  const stats = await findGroupsStatsBatch(groupIds, userId, now);

  // Build group items using batch stats
  // Format fixtures in one place (service layer) before passing to builders
  const data: ApiGroupItem[] = groups.map((group) => {
    const isDraft = group.status === GROUP_STATUS.DRAFT;

    if (isDraft) {
      const rawFirstGame = stats.firstGameByGroupId.get(group.id) ?? null;
      // Service layer decides: no prediction, no result for first game in draft
      const firstGame = formatFixtureFromDb(rawFirstGame, null, null);
      return buildDraftGroupItem(group, firstGame);
    } else {
      const memberCount = stats.memberCountByGroupId.get(group.id) ?? 0;
      const totalFixtures = stats.fixtureCountByGroupId.get(group.id) ?? 0;
      const predictionsCount =
        stats.predictionCountByGroupId.get(group.id) ?? 0;
      const hasUnpredictedGames =
        stats.hasUnpredictedGamesByGroupId.has(group.id);
      const rawNextGame = stats.nextGameByGroupId.get(group.id) ?? null;
      // Service layer decides: no prediction, no result for next game
      const nextGame = formatFixtureFromDb(rawNextGame, null, null);

      return buildActiveGroupItem(
        group,
        {
          memberCount,
          totalFixtures,
          predictionsCount,
          hasUnpredictedGames,
        },
        nextGame
      );
    }
  });

  return {
    status: "success",
    data,
    message: "Groups fetched successfully",
  };
}

/**
 * Get a group by ID.
 * Verifies that the user is the creator.
 * Returns 404 if group doesn't exist or user is not the creator.
 * Optionally includes fixtures with user predictions when includeFixtures=true.
 * When filters are provided, fixtures are filtered before being attached.
 */
export async function getGroupById(
  id: number,
  userId: number,
  includeFixtures?: boolean,
  filters?: GroupFixturesFilter
): Promise<ApiGroupResponse> {
  const { group } = await assertGroupMember(id, userId);

  const data: ApiGroupItem = buildGroupItem(group);

  // Include fixtures if requested
  if (includeFixtures) {
    const rows = await fetchGroupFixturesWithPredictions(id, userId);
    const fixturesData: ApiFixturesListResponse["data"] = rows.map((row) => {
      const prediction = parsePrediction(
        row.groupPredictions[0]?.prediction,
        row.groupPredictions[0] || null
      );
      // Service layer decides: use result from fixture, or null if not available
      return formatFixtureFromDb(
        row.fixtures,
        prediction,
        row.fixtures.result ?? null
      );
    }).filter((fixture): fixture is NonNullable<typeof fixture> => fixture !== null);

    data.fixtures =
      filters != null
        ? applyGroupFixturesFilter(fixturesData, filters)
        : fixturesData;
  }

  return {
    status: "success",
    data,
    message: "Group fetched successfully",
  };
}

/**
 * Get fixtures attached to a specific group.
 * - Verifies that the user is the creator or a joined member.
 * - Returns fixtures in chronological order by kickoff time.
 * When filters are provided, fixtures are filtered before being returned.
 */
export async function getGroupFixtures(
  id: number,
  userId: number,
  filters?: GroupFixturesFilter
): Promise<ApiGroupFixturesResponse> {
  await assertGroupMember(id, userId);

  const rows = await fetchGroupFixturesWithPredictions(id, userId);
  const data: ApiFixturesListResponse["data"] = rows.map((row) => {
    const predictionRow =
      row.groupPredictions && row.groupPredictions.length > 0
        ? row.groupPredictions[0]
        : null;
    const prediction = parsePrediction(
      predictionRow?.prediction ?? null,
      predictionRow
    );
    // Service layer decides: use result from fixture, or null if not available
    // Minimal type assertion: Prisma's type inference doesn't narrow nested selects perfectly
    return formatFixtureFromDb(
      row.fixtures as FixtureWithRelationsAndResult,
      prediction,
      row.fixtures.result ?? null
    );
  }).filter((fixture): fixture is NonNullable<typeof fixture> => fixture !== null);

  const finalData =
    filters != null ? applyGroupFixturesFilter(data, filters) : data;

  return {
    status: "success",
    data: finalData,
    message: "Group fixtures fetched successfully",
  };
}
