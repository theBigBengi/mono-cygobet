// domains/groups/index.ts
// Public exports for groups domain.

export {
  useMyGroupsQuery,
  useGroupQuery,
  useCreateGroupMutation,
  useUpdateGroupMutation,
  usePublishGroupMutation,
  useGroupFixturesQuery,
  useSaveGroupPredictionMutation,
  useSaveGroupPredictionsBatchMutation,
} from "./groups.hooks";
export { groupsKeys } from "./groups.keys";
export {
  createGroup,
  fetchMyGroups,
  fetchGroupById,
  fetchGroupFixtures,
} from "./groups.api";
export type {
  ApiCreateGroupBody,
  ApiGroupItem,
  ApiGroupResponse,
  ApiGroupsResponse,
  ApiGroupPrivacy,
  ApiGroupFixturesResponse,
} from "@repo/types";
