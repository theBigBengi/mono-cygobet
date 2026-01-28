// groups/repository/index.ts
// Repository layer for groups - single boundary with strict interface.

import type { GroupsRepository } from "./interface";

// Core functions
import {
  findGroupsByUserId,
  findGroupById,
  deleteGroup,
  findGroupRules,
  publishGroupInternal,
  createGroupWithMemberAndRules,
  findGroupMembersWithUsers,
} from "./core";

// Fixtures functions
import {
  findGroupFixturesByGroupId,
  deleteGroupFixtures,
  findGroupFixturesForFilters,
  findGroupFixtureByGroupAndFixture,
  findGroupFixturesByFixtureIds,
  fetchGroupFixturesWithPredictions,
  findGroupFixturesForOverview,
  updateGroupWithFixtures,
} from "./fixtures";

// Predictions functions
import {
  upsertGroupPrediction,
  upsertGroupPredictionsBatch,
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
  createGroupWithMemberAndRules,
  updateGroupWithFixtures,
  publishGroupInternal,
  deleteGroup,
  findGroupRules,
  findGroupMembersWithUsers,

  // Fixtures operations
  findGroupFixturesByGroupId,
  deleteGroupFixtures,
  findGroupFixturesForFilters,
  findGroupFixtureByGroupAndFixture,
  findGroupFixturesByFixtureIds,
  fetchGroupFixturesWithPredictions,
  findGroupFixturesForOverview,

  // Predictions operations
  upsertGroupPrediction,
  upsertGroupPredictionsBatch,
  findPredictionsForOverview,

  // Stats operations
  findGroupsStatsBatch,

  // User operations
  getUserUsername,
  countDraftGroupsByCreator,
};

// Export the interface type
export type { GroupsRepository };
