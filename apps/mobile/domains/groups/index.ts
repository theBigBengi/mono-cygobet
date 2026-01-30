// domains/groups/index.ts
// Public exports for groups domain.

export {
  useMyGroupsQuery,
  useGroupQuery,
  useGroupGamesFiltersQuery,
  useCreateGroupMutation,
  useUpdateGroupMutation,
  usePublishGroupMutation,
  useGroupFixturesQuery,
  useSaveGroupPredictionMutation,
  useSaveGroupPredictionsBatchMutation,
  useDeleteGroupMutation,
  usePredictionsOverviewQuery,
  useGroupRankingQuery,
} from "./groups.hooks";
export { groupsKeys } from "./groups.keys";
export {
  createGroup,
  fetchMyGroups,
  fetchGroupById,
  fetchGroupFixtures,
  fetchGroupGamesFilters,
} from "./groups.api";
export type {
  ApiCreateGroupBody,
  ApiGroupItem,
  ApiGroupResponse,
  ApiGroupsResponse,
  ApiGroupPrivacy,
  ApiGroupFixturesResponse,
} from "@repo/types";
