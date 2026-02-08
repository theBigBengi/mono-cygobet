// domains/groups/groups-members.hooks.ts
// React Query hooks for group members, ranking, and nudge.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ApiRankingResponse,
  ApiGroupMembersResponse,
  ApiNudgeBody,
  ApiNudgeResponse,
} from "@repo/types";
import type { ApiError } from "@/lib/http/apiError";
import { useAuth } from "@/lib/auth/useAuth";
import { isReadyForProtected } from "@/lib/auth/guards";
import {
  fetchGroupMembers,
  fetchGroupRanking,
  sendNudge,
} from "./groups-members.api";
import { groupsKeys } from "./groups.keys";

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
