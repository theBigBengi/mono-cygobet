// groups/repository/interface.ts
// GroupsRepository interface - contract for all repository operations.

import type { groupPrivacy, groupPredictionMode, groupKoRoundMode, groupSelectionMode, groupInviteAccess } from "@repo/db";
import type { Prisma } from "@repo/db";
import type { FixtureWithRelationsAndResult } from "../types";

type BatchPayload = { count: number };

/**
 * GroupsRepository interface - defines all repository methods used by services.
 * This is a real contract, not just documentation.
 */
export interface GroupsRepository {
  // Core operations
  findGroupsByUserId(userId: number): Promise<Array<Prisma.groupsGetPayload<{}>>>;
  findGroupById(id: number): Promise<Prisma.groupsGetPayload<{}> | null>;
  findPublicGroupsPaginated(params: {
    page: number;
    perPage: number;
    search?: string;
    excludeUserId?: number;
  }): Promise<{
    groups: Array<{
      id: number;
      name: string;
      createdAt: Date;
      creatorId: number;
      groupRules: { maxMembers: number } | null;
    }>;
    totalCount: number;
  }>;
  createGroupMember(data: {
    groupId: number;
    userId: number;
    role: "owner" | "member";
    status: "joined";
  }): Promise<Prisma.groupMembersGetPayload<{}>>;
  updateGroup(id: number, data: Prisma.groupsUpdateInput): Promise<Prisma.groupsGetPayload<{}>>;
  createGroupWithMemberAndRules(data: {
    name: string;
    creatorId: number;
    privacy: groupPrivacy;
    selectionMode: "games" | "teams" | "leagues";
    fixtureIds: number[];
    teamIds: number[];
    leagueIds: number[];
    now: number;
    inviteAccess?: "all" | "admin_only";
  }): Promise<Prisma.groupsGetPayload<{}>>;
  updateGroupWithFixtures(
    groupId: number,
    updateData: Prisma.groupsUpdateInput,
    fixtureIds?: number[],
    tx?: Prisma.TransactionClient
  ): Promise<Prisma.groupsGetPayload<{}>>;
  publishGroupInternal(data: {
    groupId: number;
    status: "active";
    name?: string;
    privacy?: groupPrivacy;
    onTheNosePoints?: number;
    correctDifferencePoints?: number;
    outcomePoints?: number;
    predictionMode?: groupPredictionMode;
    koRoundMode?: groupKoRoundMode;
    inviteAccess?: groupInviteAccess;
    maxMembers?: number;
    nudgeEnabled?: boolean;
    nudgeWindowMinutes?: number;
  }): Promise<Prisma.groupsGetPayload<{}>>;
  deleteGroup(id: number): Promise<Prisma.groupsGetPayload<{}>>;
  findGroupRules(groupId: number): Promise<{
    selectionMode: groupSelectionMode;
    groupTeamsIds: number[];
    inviteAccess?: groupInviteAccess;
    maxMembers?: number;
    predictionMode?: groupPredictionMode;
    koRoundMode?: groupKoRoundMode;
    onTheNosePoints?: number;
    correctDifferencePoints?: number;
    outcomePoints?: number;
    nudgeEnabled?: boolean;
    nudgeWindowMinutes?: number;
  } | null>;
  createNudgeEvent(data: {
    groupId: number;
    fixtureId: number;
    nudgerUserId: number;
    targetUserId: number;
  }): Promise<unknown>;
  findNudgesByNudgerInGroup(
    groupId: number,
    nudgerUserId: number,
    fixtureIds?: number[]
  ): Promise<Array<{ targetUserId: number; fixtureId: number }>>;
  findGroupRulesNudgeBatch(
    groupIds: number[]
  ): Promise<Array<{ groupId: number; nudgeEnabled: boolean; nudgeWindowMinutes: number }>>;
  findGroupMembersWithUsers(groupId: number): Promise<{
    members: Array<{ userId: number; role: string; createdAt: Date }>;
    users: Array<{ id: number; username: string | null }>;
  }>;

  // Fixtures operations
  findGroupFixturesByGroupId(groupId: number): Promise<Array<{ fixtureId: number }>>;
  deleteGroupFixtures(groupId: number, fixtureIds: number[]): Promise<BatchPayload | undefined>;
  findGroupFixturesForFilters(groupId: number): Promise<Array<{
    fixtureId: number;
    fixtures: {
      id: number;
      round: string | null;
      league: {
        id: number;
        name: string;
        imagePath: string | null;
        country: {
          id: number;
          name: string;
          imagePath: string | null;
        } | null;
        seasons: Array<{ id: number }>;
      } | null;
    };
  }>>;
  findGroupFixtureByGroupAndFixture(
    groupId: number,
    fixtureId: number
  ): Promise<{ id: number; groupId: number; fixtureId: number } | null>;
  findGroupFixturesByFixtureIds(
    groupId: number,
    fixtureIds: number[]
  ): Promise<Array<{ id: number; groupId: number; fixtureId: number }>>;
  findFixtureByGroupFixtureId(
    groupFixtureId: number
  ): Promise<{ startTs: number; state: string; result: string | null } | null>;
  findGroupFixturesWithFixtureDetails(groupId: number): Promise<Array<{
    id: number;
    fixtureId: number;
    startTs: number;
    state: string;
  }>>;
  findStartedFixturesByGroupFixtureIds(
    groupFixtureIds: number[]
  ): Promise<Array<{ id: number }>>;
  fetchGroupFixturesWithPredictions(
    groupId: number,
    userId: number
  ): Promise<Array<{
    id: number;
    fixtures: FixtureWithRelationsAndResult;
    groupPredictions: Array<{
      prediction: string;
      updatedAt: Date;
      placedAt: Date;
      settledAt: Date | null;
      points: number | string | null;
    }>;
  }>>;
  findGroupFixturesForOverview(groupId: number): Promise<Array<{
    fixtureId: number;
    fixtures: {
      id: number;
      name: string;
      startTs: number;
      state: string;
      result: string | null;
      homeTeam: {
        id: number;
        name: string;
        imagePath: string | null;
      };
      awayTeam: {
        id: number;
        name: string;
        imagePath: string | null;
      };
    };
  }>>;

  // Predictions operations
  upsertGroupPrediction(data: {
    userId: number;
    groupFixtureId: number;
    groupId: number;
    prediction: string;
  }): Promise<Prisma.groupPredictionsGetPayload<{}>>;
  upsertGroupPredictionsBatch(
    groupId: number,
    userId: number,
    predictions: Array<{
      groupFixtureId: number;
      prediction: string;
    }>
  ): Promise<Array<Prisma.groupPredictionsGetPayload<{}>>>;
  findGroupPredictionByUserAndGroupFixture(
    userId: number,
    groupFixtureId: number
  ): Promise<Prisma.groupPredictionsGetPayload<{}> | null>;
  findGroupPredictionUserIdsByGroupFixtureIds(
    groupId: number,
    groupFixtureIds: number[]
  ): Promise<Array<{ groupFixtureId: number; userId: number }>>;
  findPredictionsForOverview(groupId: number): Promise<Array<{
    userId: number;
    groupFixtureId: number;
    prediction: string;
    points: string;
    settledAt: Date | null;
    groupFixtures: {
      fixtureId: number;
    };
  }>>;

  // Stats operations
  findGroupsStatsBatch(
    groupIds: number[],
    userId: number,
    now: number
  ): Promise<{
    memberCountByGroupId: Map<number, number>;
    fixtureCountByGroupId: Map<number, number>;
    predictionCountByGroupId: Map<number, number>;
    hasUnpredictedGamesByGroupId: Set<number>;
    nextGameByGroupId: Map<number, any | null>;
    firstGameByGroupId: Map<number, any | null>;
    lastGameByGroupId: Map<number, any | null>;
    unpredictedGamesCountByGroupId: Map<number, number>;
    todayGamesCountByGroupId: Map<number, number>;
    todayUnpredictedCountByGroupId: Map<number, number>;
    liveGamesCountByGroupId: Map<number, number>;
  }>;

  // User operations (re-exported from users/repository)
  getUserUsername(userId: number): Promise<string | null>;
  countDraftGroupsByCreator(creatorId: number): Promise<number>;

  // Invite/Join operations
  countGroupMembers(groupId: number): Promise<number>;
  findGroupByInviteCode(inviteCode: string): Promise<Prisma.groupsGetPayload<{}> | null>;
  findGroupMember(groupId: number, userId: number): Promise<Prisma.groupMembersGetPayload<{}> | null>;
  updateGroupMember(id: number, data: { status: string }): Promise<Prisma.groupMembersGetPayload<{}>>;
}
