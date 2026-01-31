// groups/index.ts
// Groups API: service + fixtures filter.

export {
  createGroup,
  getMyGroups,
  getPublicGroups,
  getGroupById,
  getGroupGamesFilters,
  updateGroup,
  publishGroup,
  getGroupFixtures,
  saveGroupPrediction,
  saveGroupPredictionsBatch,
  deleteGroup,
  getPredictionsOverview,
  getGroupRanking,
  getGroupMembers,
  settlePredictionsForFixtures,
  joinGroupByCode,
  joinPublicGroup,
  generateInviteCode,
  getInviteCode,
} from "./service/index";
