// domains/groups/groups-invite.hooks.ts
// React Query hooks for group invite codes and joining groups.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ApiGroupResponse,
  ApiInviteCodeResponse,
} from "@repo/types";
import type { ApiError } from "@/lib/http/apiError";
import { analytics } from "@/lib/analytics";
import { useAuth } from "@/lib/auth/useAuth";
import { isReadyForProtected } from "@/lib/auth/guards";
import {
  joinGroupByCode,
  joinPublicGroup,
  fetchInviteCode,
  regenerateInviteCode,
} from "./groups-invite.api";
import { groupsKeys } from "./groups.keys";

/**
 * Hook to fetch invite code for a group (creator only).
 * - Enabled only when authenticated and onboarding complete and groupId is valid.
 */
export function useInviteCodeQuery(groupId: number | null) {
  const { status, user } = useAuth();

  const enabled =
    isReadyForProtected(status, user) &&
    groupId != null &&
    !Number.isNaN(groupId);

  return useQuery<ApiInviteCodeResponse, ApiError>({
    queryKey: groupsKeys.inviteCode(groupId ?? 0),
    queryFn: () => fetchInviteCode(groupId as number),
    enabled,
    meta: { scope: "user" },
  });
}

/**
 * Hook to join a group by invite code.
 * - Requires authentication.
 * - Invalidates groups list on success.
 */
export function useJoinGroupByCodeMutation() {
  const queryClient = useQueryClient();

  return useMutation<ApiGroupResponse, ApiError, string>({
    mutationFn: (code) => joinGroupByCode(code),
    onSuccess: (data) => {
      analytics.track("group_joined", { groupId: data.data?.id, method: "invite_code" });
      queryClient.invalidateQueries({ queryKey: groupsKeys.lists() });
    },
  });
}

/**
 * Hook to join a public group by ID.
 * - Requires authentication.
 * - Invalidates groups list and group detail on success.
 */
export function useJoinPublicGroupMutation(groupId: number | null) {
  const queryClient = useQueryClient();

  return useMutation<ApiGroupResponse, ApiError, void>({
    mutationFn: () => {
      if (!groupId) {
        throw new Error("Group ID is required");
      }
      return joinPublicGroup(groupId);
    },
    onSuccess: () => {
      analytics.track("group_joined", { groupId, method: "public" });
      queryClient.invalidateQueries({ queryKey: groupsKeys.lists() });
      if (groupId) {
        queryClient.invalidateQueries({
          queryKey: groupsKeys.detail(groupId),
        });
      }
      queryClient.invalidateQueries({
        queryKey: [...groupsKeys.all, "public"],
      });
    },
  });
}

/**
 * Hook to regenerate invite code for a group (creator only).
 * - Requires authentication.
 * - Invalidates invite code query on success.
 */
export function useRegenerateInviteCodeMutation(groupId: number | null) {
  const queryClient = useQueryClient();

  return useMutation<ApiInviteCodeResponse, ApiError, void>({
    mutationFn: () => {
      if (!groupId) {
        throw new Error("Group ID is required");
      }
      return regenerateInviteCode(groupId);
    },
    onSuccess: () => {
      if (groupId) {
        queryClient.invalidateQueries({
          queryKey: groupsKeys.inviteCode(groupId),
        });
      }
    },
  });
}
