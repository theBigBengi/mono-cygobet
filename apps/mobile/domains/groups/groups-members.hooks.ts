// domains/groups/groups-members.hooks.ts
// React Query hooks for group members, ranking, and nudge.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import type {
  ApiRankingResponse,
  ApiGroupMembersResponse,
  ApiNudgeBody,
  ApiNudgeResponse,
  ApiLeaveGroupResponse,
} from "@repo/types";
import type { ApiError } from "@/lib/http/apiError";
import { useAuth } from "@/lib/auth/useAuth";
import { isReadyForProtected } from "@/lib/auth/guards";
import {
  fetchGroupMembers,
  fetchGroupRanking,
  sendNudge,
  leaveGroup,
} from "./groups-members.api";
import { groupsKeys } from "./groups.keys";
import { analytics } from "@/lib/analytics";

/**
 * Hook to fetch group ranking.
 * - Enabled only when authenticated and onboarding complete and groupId is valid.
 */
export function useGroupRankingQuery(groupId: number | null) {
  const { status, user } = useAuth();

  const enabled =
    isReadyForProtected(status, user) &&
    groupId != null &&
    !Number.isNaN(groupId);

  return useQuery<ApiRankingResponse, ApiError>({
    queryKey: groupsKeys.ranking(groupId ?? 0),
    queryFn: () => fetchGroupRanking(groupId as number),
    enabled,
    meta: { scope: "user" },
  });
}

/**
 * Hook to leave a group.
 * - Requires authentication.
 * - User must be a member (not creator).
 * - Invalidates groups list and navigates to groups tab on success.
 */
export function useLeaveGroupMutation(groupId: number | null) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation<ApiLeaveGroupResponse, ApiError, void>({
    mutationFn: () => {
      if (!groupId) {
        throw new Error("Group ID is required");
      }
      return leaveGroup(groupId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupsKeys.lists() });
      router.replace("/(tabs)/groups" as any);
      analytics.track("group_left", { groupId });
    },
  });
}

/**
 * Hook to send a nudge to a group member for a fixture.
 * - Requires authentication.
 * - Invalidates ranking query on success.
 */
export function useNudgeMutation(groupId: number | null) {
  const queryClient = useQueryClient();

  return useMutation<ApiNudgeResponse, ApiError, ApiNudgeBody>({
    mutationFn: (body) => {
      if (!groupId) {
        throw new Error("Group ID is required");
      }
      return sendNudge(groupId, body);
    },
    onSuccess: () => {
      if (groupId) {
        queryClient.invalidateQueries({
          queryKey: groupsKeys.ranking(groupId),
        });
        queryClient.invalidateQueries({
          queryKey: groupsKeys.detail(groupId),
        });
      }
    },
  });
}

/**
 * Hook to fetch group members.
 * - Enabled only when authenticated and onboarding complete and groupId is valid.
 */
export function useGroupMembersQuery(groupId: number | null) {
  const { status, user } = useAuth();

  const enabled =
    isReadyForProtected(status, user) &&
    groupId != null &&
    !Number.isNaN(groupId);

  return useQuery<ApiGroupMembersResponse, ApiError>({
    queryKey: groupsKeys.members(groupId ?? 0),
    queryFn: () => fetchGroupMembers(groupId as number),
    enabled,
    meta: { scope: "user" },
  });
}
