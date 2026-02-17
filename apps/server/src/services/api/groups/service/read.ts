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
import { prisma } from "@repo/db";
import { FIXTURE_SELECT_BASE } from "../../fixtures/selects";
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
export async function getMyGroups(userId: number): Promise<ApiGroupsResponse> {
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

  // Fetch all stats and nudge rules in batch
  const [stats, rulesNudge] = await Promise.all([
    repo.findGroupsStatsBatch(groupIds, userId, now),
    repo.findGroupRulesNudgeBatch(groupIds),
  ]);

  // Collect all team IDs from teams-mode groups
  const allTeamIds = new Set<number>();
  rulesNudge.forEach((r) => {
    if (r.selectionMode === "teams" && r.groupTeamsIds) {
      r.groupTeamsIds.forEach((id) => allTeamIds.add(id));
    }
  });

  // Fetch team info if needed
  const teamInfoMap = new Map<number, { id: number; name: string; shortCode: string | null }>();
  if (allTeamIds.size > 0) {
    const teams = await prisma.teams.findMany({
      where: { id: { in: Array.from(allTeamIds) } },
      select: { id: true, name: true, shortCode: true },
    });
    teams.forEach((t) => teamInfoMap.set(t.id, { id: t.id, name: t.name, shortCode: t.shortCode }));
  }

  const rulesByGroupId = new Map(
    rulesNudge.map((r) => {
      const groupTeams = r.selectionMode === "teams" && r.groupTeamsIds
        ? r.groupTeamsIds.map((id) => teamInfoMap.get(id)).filter(Boolean)
        : [];
      return [
        r.groupId,
        {
          nudgeEnabled: r.nudgeEnabled,
          nudgeWindowMinutes: r.nudgeWindowMinutes,
          selectionMode: r.selectionMode,
          groupTeams,
        },
      ];
    })
  );

  // Build group items using batch stats
  // Format fixtures in one place (service layer) before passing to builders
  const data: ApiGroupItem[] = groups.map((group) => {
    const isDraft = group.status === GROUP_STATUS.DRAFT;

    if (isDraft) {
      const rawFirstGame = stats.firstGameByGroupId.get(group.id) ?? null;
      const rawLastGame = stats.lastGameByGroupId.get(group.id) ?? null;
      // Service layer decides: no prediction, no result for first/last game in draft
      const firstGame = formatFixtureFromDb(rawFirstGame, null, null);
      const lastGame = formatFixtureFromDb(rawLastGame, null, null);
      const draftItem = buildDraftGroupItem(group, firstGame, lastGame);
      const rules = rulesByGroupId.get(group.id);
      if (rules) {
        draftItem.nudgeEnabled = rules.nudgeEnabled;
        draftItem.nudgeWindowMinutes = rules.nudgeWindowMinutes;
        draftItem.selectionMode = rules.selectionMode;
        if (rules.groupTeams && rules.groupTeams.length > 0) {
          (draftItem as any).groupTeams = rules.groupTeams;
        }
      }
      return draftItem;
    } else {
      const memberCount = stats.memberCountByGroupId.get(group.id) ?? 0;
      const totalFixtures = stats.fixtureCountByGroupId.get(group.id) ?? 0;
      const predictionsCount =
        stats.predictionCountByGroupId.get(group.id) ?? 0;
      const completedFixturesCount =
        stats.completedFixturesCountByGroupId.get(group.id) ?? 0;
      const hasUnpredictedGames = stats.hasUnpredictedGamesByGroupId.has(
        group.id
      );
      const unpredictedGamesCount =
        stats.unpredictedGamesCountByGroupId.get(group.id) ?? 0;
      const todayGamesCount = stats.todayGamesCountByGroupId.get(group.id) ?? 0;
      const todayUnpredictedCount =
        stats.todayUnpredictedCountByGroupId.get(group.id) ?? 0;
      const liveGamesCount = stats.liveGamesCountByGroupId.get(group.id) ?? 0;
      const missedPredictionsCount =
        stats.missedPredictionsCountByGroupId.get(group.id) ?? 0;
      const userRank = stats.userRankByGroupId.get(group.id);
      const rawNextGame = stats.nextGameByGroupId.get(group.id) ?? null;
      const rawFirstGame = stats.firstGameByGroupId.get(group.id) ?? null;
      const rawLastGame = stats.lastGameByGroupId.get(group.id) ?? null;

      // Get user's prediction for the next game
      const nextGamePrediction = rawNextGame
        ? stats.userPredictionsByGroupFixture.get(`${group.id}_${rawNextGame.id}`)
        : null;
      const parsedNextGamePrediction = nextGamePrediction
        ? {
            home: nextGamePrediction.home,
            away: nextGamePrediction.away,
            updatedAt: nextGamePrediction.updatedAt.toISOString(),
            placedAt: nextGamePrediction.placedAt.toISOString(),
            settled: nextGamePrediction.settled,
            points: nextGamePrediction.points ? parseInt(nextGamePrediction.points, 10) : null,
          }
        : null;

      // Service layer decides: include prediction for next game, no result
      const nextGame = formatFixtureFromDb(rawNextGame, parsedNextGamePrediction, null);
      const firstGame = formatFixtureFromDb(rawFirstGame, null, null);
      const lastGame = formatFixtureFromDb(rawLastGame, null, null);

      const activeItem = buildActiveGroupItem(
        group,
        {
          memberCount,
          totalFixtures,
          predictionsCount,
          completedFixturesCount,
          hasUnpredictedGames,
          unpredictedGamesCount,
          todayGamesCount,
          todayUnpredictedCount,
          liveGamesCount,
          missedPredictionsCount,
          userRank,
        },
        nextGame,
        firstGame,
        lastGame
      );
      const rules = rulesByGroupId.get(group.id);
      if (rules) {
        activeItem.nudgeEnabled = rules.nudgeEnabled;
        activeItem.nudgeWindowMinutes = rules.nudgeWindowMinutes;
        activeItem.selectionMode = rules.selectionMode;
        if (rules.groupTeams && rules.groupTeams.length > 0) {
          (activeItem as any).groupTeams = rules.groupTeams;
        }
      }
      return activeItem;
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
  data.selectionMode = rules?.selectionMode ?? "games";
  data.groupTeamsIds = rules?.groupTeamsIds ?? [];
  data.koRoundMode = rules?.koRoundMode ?? "FullTime";
  data.onTheNosePoints = rules?.onTheNosePoints ?? 3;
  data.correctDifferencePoints = rules?.correctDifferencePoints ?? 2;
  data.outcomePoints = rules?.outcomePoints ?? 1;
  data.nudgeEnabled = rules?.nudgeEnabled ?? true;
  data.nudgeWindowMinutes = rules?.nudgeWindowMinutes ?? 60;

  if (group.status !== "draft") {
    const firstGf = await prisma.groupFixtures.findFirst({
      where: { groupId: id },
      orderBy: { fixtures: { startTs: "asc" } },
      select: { fixtures: { select: FIXTURE_SELECT_BASE } },
    });
    const rawFirst = firstGf?.fixtures ?? null;
    data.firstGame = formatFixtureFromDb(
      rawFirst as Parameters<typeof formatFixtureFromDb>[0],
      null,
      null
    );
  }

  // Include fixtures if requested
  if (includeFixtures) {
    const rows = await repo.fetchGroupFixturesWithPredictions(id, userId);
    const fixturesData = mapGroupFixturesToApiFixtures(rows, userId);

    data.fixtures =
      filters != null
        ? applyGroupFixturesFilter(fixturesData, filters)
        : fixturesData;
  }

  if (group.status !== "draft") {
    const memberCount = await repo.countGroupMembers(id);
    data.memberCount = memberCount;
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

  log.info(
    { id, userId, count: finalData.length },
    "getGroupFixtures - fetched"
  );
  return {
    status: "success",
    data: finalData,
    message: "Group fixtures fetched successfully",
  };
}
