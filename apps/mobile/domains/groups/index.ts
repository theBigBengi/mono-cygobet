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
  useNudgeMutation,
  useGroupMembersQuery,
  useInviteCodeQuery,
  useJoinGroupByCodeMutation,
  useJoinPublicGroupMutation,
  useRegenerateInviteCodeMutation,
  useGroupPreviewQuery,
} from "./groups.hooks";
export {
  useGroupMessagesQuery,
  useUnreadCountsQuery,
  useGroupChatPreviewQuery,
  useGroupChat,
} from "./groups-chat.hooks";
export { groupsKeys } from "./groups.keys";
export {
  createGroup,
  fetchMyGroups,
  fetchPublicGroups,
  fetchGroupById,
  publishGroup,
  fetchGroupFixtures,
  fetchGroupGamesFilters,
  joinGroupByCode,
  joinPublicGroup,
  fetchInviteCode,
  regenerateInviteCode,
  fetchGroupPreview,
} from "./groups.api";
export {
  fetchGroupMessages,
  fetchUnreadCounts,
  fetchGroupChatPreview,
} from "./groups-chat.api";
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
  ApiGroupPreviewBody,
  ApiGroupPreviewResponse,
} from "@repo/types";
