// groups/repository/index.ts
// Repository layer for groups - exports all public functions.

// Core functions
export {
  findGroupsByUserId,
  findGroupById,
  createGroup,
  createGroupMember,
  updateGroup,
  deleteGroup,
  findGroupRules,
  publishGroupInternal,
  createGroupWithMemberAndRules,
  findGroupMembersWithUsers,
} from "./core";

// Fixtures functions
export {
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
export {
  upsertGroupPrediction,
  upsertGroupPredictionsBatch,
  findPredictionsForOverview,
} from "./predictions";

// Stats functions
export { findGroupsStatsBatch } from "./stats";
