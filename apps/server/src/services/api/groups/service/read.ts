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
import { DEFAULT_MAX_MEMBERS, GROUP_STATUS } from "../constants";
import {
  buildDraftGroupItem,
  buildActiveGroupItem,
  formatFixtureFromDb,
  buildGroupItem,
} from "../builders";
import { assertGroupMember } from "../permissions";
import { repository as repo } from "../repository";
import { mapGroupFixturesToApiFixtures } from "../helpers/fixture-mapper";
import { getLogger } from "../../../../logger";

const log = getLogger("groups.read");

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
  log.debug({ userId }, "getMyGroups - start");
  // Find all groups where user is either creator or a joined member
  const groups = await repo.findGroupsByUserId(userId);

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
  const stats = await repo.findGroupsStatsBatch(groupIds, userId, now);

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
  log.debug({ id, userId, includeFixtures, filters }, "getGroupById - start");
  const { group } = await assertGroupMember(id, userId);

  const data: ApiGroupItem = buildGroupItem(group);

  const rules = await repo.findGroupRules(id);
  data.inviteAccess = rules?.inviteAccess ?? "all";
  data.maxMembers = rules?.maxMembers ?? DEFAULT_MAX_MEMBERS;
  data.predictionMode = rules?.predictionMode ?? "CorrectScore";
  data.koRoundMode = rules?.koRoundMode ?? "FullTime";
  data.onTheNosePoints = rules?.onTheNosePoints ?? 3;
  data.correctDifferencePoints = rules?.correctDifferencePoints ?? 2;
  data.outcomePoints = rules?.outcomePoints ?? 1;

  // Include fixtures if requested
  if (includeFixtures) {
    const rows = await repo.fetchGroupFixturesWithPredictions(id, userId);
    const fixturesData = mapGroupFixturesToApiFixtures(rows, userId);

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
  log.debug({ id, userId, filters }, "getGroupFixtures - start");
  await assertGroupMember(id, userId);

  const rows = await repo.fetchGroupFixturesWithPredictions(id, userId);
  const data = mapGroupFixturesToApiFixtures(rows, userId);

  const finalData =
    filters != null ? applyGroupFixturesFilter(data, filters) : data;

  log.info({ id, userId, count: finalData.length }, "getGroupFixtures - fetched");
  return {
    status: "success",
    data: finalData,
    message: "Group fixtures fetched successfully",
  };
}
