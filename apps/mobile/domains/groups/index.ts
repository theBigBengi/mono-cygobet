// domains/groups/index.ts
// Public exports for groups domain.

// --- Core (CRUD, listing, fixtures) ---
export {
  useMyGroupsQuery,
  usePublicGroupsQuery,
  useGroupQuery,
  useGroupGamesFiltersQuery,
  useCreateGroupMutation,
  useUpdateGroupMutation,
  usePublishGroupMutation,
  useGroupFixturesQuery,
  useDeleteGroupMutation,
  useGroupPreviewQuery,
} from "./groups-core.hooks";
export {
  createGroup,
  fetchMyGroups,
  fetchPublicGroups,
  fetchGroupById,
  fetchGroupFixtures,
  fetchGroupGamesFilters,
  fetchGroupPreview,
} from "./groups-core.api";

// --- Predictions ---
export {
  useSaveGroupPredictionMutation,
  useSaveGroupPredictionsBatchMutation,
  usePredictionsOverviewQuery,
} from "./groups-predictions.hooks";

// --- Members & Ranking ---
export {
  useGroupRankingQuery,
  useNudgeMutation,
  useGroupMembersQuery,
  useLeaveGroupMutation,
} from "./groups-members.hooks";

// --- Invite & Join ---
export {
  useInviteCodeQuery,
  useJoinGroupByCodeMutation,
  useJoinPublicGroupMutation,
  useRegenerateInviteCodeMutation,
} from "./groups-invite.hooks";
export {
  joinGroupByCode,
  joinPublicGroup,
  fetchInviteCode,
  regenerateInviteCode,
} from "./groups-invite.api";

// --- Chat ---
export {
  useGroupMessagesQuery,
  useUnreadCountsQuery,
  useGroupChatPreviewQuery,
  useGroupChat,
} from "./groups-chat.hooks";
export {
  fetchGroupMessages,
  fetchUnreadCounts,
  fetchGroupChatPreview,
} from "./groups-chat.api";

// --- Keys ---
export { groupsKeys } from "./groups.keys";

// --- Types (re-exported from @repo/types) ---
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
