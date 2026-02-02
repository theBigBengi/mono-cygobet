// groups/repository/index.ts
// Repository layer for groups - single boundary with strict interface.

import type { GroupsRepository } from "./interface";

// Core functions
import {
  findGroupsByUserId,
  findGroupById,
  findPublicGroupsPaginated,
  deleteGroup,
  findGroupRules,
  publishGroupInternal,
  createGroupWithMemberAndRules,
  findGroupMembersWithUsers,
  updateGroup,
  createGroupMember,
  countGroupMembers,
  findGroupByInviteCode,
  findGroupMember,
  updateGroupMember,
  createNudgeEvent,
  findNudgesByNudgerInGroup,
  findGroupRulesNudgeBatch,
} from "./core";

// Fixtures functions
import {
  findGroupFixturesByGroupId,
  deleteGroupFixtures,
  findGroupFixturesForFilters,
  findGroupFixtureByGroupAndFixture,
  findGroupFixturesByFixtureIds,
  findFixtureByGroupFixtureId,
  findGroupFixturesWithFixtureDetails,
  findStartedFixturesByGroupFixtureIds,
  fetchGroupFixturesWithPredictions,
  findGroupFixturesForOverview,
  updateGroupWithFixtures,
} from "./fixtures";

// Predictions functions
import {
  upsertGroupPrediction,
  upsertGroupPredictionsBatch,
  findGroupPredictionByUserAndGroupFixture,
  findGroupPredictionUserIdsByGroupFixtureIds,
  findPredictionsForOverview,
} from "./predictions";

// Stats functions
import { findGroupsStatsBatch } from "./stats";

// User functions (re-exported from users/repository)
import {
  getUserUsername,
  countDraftGroupsByCreator,
} from "../../users/repository";

/**
 * Groups repository - single object implementing GroupsRepository interface.
 * This is the only boundary for repository operations.
 */
export const repository: GroupsRepository = {
  // Core operations
  findGroupsByUserId,
  findGroupById,
  findPublicGroupsPaginated,
  createGroupWithMemberAndRules,
  updateGroupWithFixtures,
  publishGroupInternal,
  deleteGroup,
  findGroupRules,
  findGroupMembersWithUsers,
  updateGroup,
  createGroupMember,
  countGroupMembers,
  findGroupByInviteCode,
  findGroupMember,
  updateGroupMember,
  createNudgeEvent,
  findNudgesByNudgerInGroup,
  findGroupRulesNudgeBatch,

  // Fixtures operations
  findGroupFixturesByGroupId,
  deleteGroupFixtures,
  findGroupFixturesForFilters,
  findGroupFixtureByGroupAndFixture,
  findGroupFixturesByFixtureIds,
  findFixtureByGroupFixtureId,
  findGroupFixturesWithFixtureDetails,
  findStartedFixturesByGroupFixtureIds,
  fetchGroupFixturesWithPredictions,
  findGroupFixturesForOverview,

  // Predictions operations
  upsertGroupPrediction,
  upsertGroupPredictionsBatch,
  findGroupPredictionByUserAndGroupFixture,
  findGroupPredictionUserIdsByGroupFixtureIds,
  findPredictionsForOverview,

  // Stats operations
  findGroupsStatsBatch,

  // User operations
  getUserUsername,
  countDraftGroupsByCreator,
};

// Export the interface type
export type { GroupsRepository };
