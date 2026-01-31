// domains/groups/index.ts
// Public exports for groups domain.

export {
  useMyGroupsQuery,
  usePublicGroupsQuery,
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
  useGroupMembersQuery,
  useInviteCodeQuery,
  useJoinGroupByCodeMutation,
  useJoinPublicGroupMutation,
  useRegenerateInviteCodeMutation,
} from "./groups.hooks";
export { groupsKeys } from "./groups.keys";
export {
  createGroup,
  fetchMyGroups,
  fetchPublicGroups,
  fetchGroupById,
  fetchGroupFixtures,
  fetchGroupGamesFilters,
  joinGroupByCode,
  joinPublicGroup,
  fetchInviteCode,
  regenerateInviteCode,
} from "./groups.api";
export type {
  ApiCreateGroupBody,
  ApiGroupItem,
  ApiGroupResponse,
  ApiGroupsResponse,
  ApiGroupPrivacy,
  ApiGroupFixturesResponse,
  ApiPublicGroupsQuery,
  ApiPublicGroupItem,
  ApiPublicGroupsResponse,
} from "@repo/types";
