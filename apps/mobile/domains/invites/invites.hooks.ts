// domains/invites/invites.hooks.ts
// React Query hooks for invites and user search.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ApiUsersSearchResponse,
  ApiSendInviteResponse,
  ApiUserInvitesResponse,
} from "@repo/types";
import type { ApiError } from "@/lib/http/apiError";
import { useAuth } from "@/lib/auth/useAuth";
import { isReadyForProtected } from "@/lib/auth/guards";
import {
  searchUsers,
  getSuggestedUsers,
  sendInvite,
  getMyInvites,
  respondToInvite,
  cancelInvite,
  type UsersSearchParams,
  type SuggestedUsersParams,
  type MyInvitesParams,
} from "./invites.api";
import { invitesKeys } from "./invites.keys";
import { groupsKeys } from "@/domains/groups/groups.keys";

/**
 * Search users by username. Enable when q has at least 3 chars.
 */
export function useUsersSearchQuery(params: {
  q: string;
  excludeGroupId?: number;
  page?: number;
  perPage?: number;
}) {
  const { status, user } = useAuth();
  const enabled =
    isReadyForProtected(status, user) && (params.q?.trim().length ?? 0) >= 3;

  return useQuery<ApiUsersSearchResponse, ApiError>({
    queryKey: invitesKeys.search(params.q, params.excludeGroupId),
    queryFn: () =>
      searchUsers({
        q: params.q,
        excludeGroupId: params.excludeGroupId,
        page: params.page,
        perPage: params.perPage,
      }),
    enabled,
    meta: { scope: "user" },
  });
}

/**
 * Get suggested users from shared private groups.
 */
export function useSuggestedUsersQuery(params?: SuggestedUsersParams) {
  const { status, user } = useAuth();
  const enabled = isReadyForProtected(status, user);

  return useQuery<ApiUsersSearchResponse, ApiError>({
    queryKey: invitesKeys.suggested(params?.excludeGroupId),
    queryFn: () => getSuggestedUsers(params),
    enabled,
    meta: { scope: "user" },
  });
}

/**
 * Send a group invite. Invalidates invites list and group detail on success.
 */
export function useSendInviteMutation(groupId: number) {
  const queryClient = useQueryClient();

  return useMutation<
    ApiSendInviteResponse,
    ApiError,
    { userId: number; message?: string }
  >({
    mutationFn: ({ userId, message }) => sendInvite(groupId, userId, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitesKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: groupsKeys.detail(groupId),
      });
      queryClient.invalidateQueries({ queryKey: groupsKeys.members(groupId) });
    },
  });
}

/**
 * My invites (inbox). Optional status filter.
 */
export function useMyInvitesQuery(params?: MyInvitesParams) {
  const { status, user } = useAuth();
  const enabled = isReadyForProtected(status, user);

  return useQuery<ApiUserInvitesResponse, ApiError>({
    queryKey: invitesKeys.list(params?.status),
    queryFn: () => getMyInvites(params),
    enabled,
    meta: { scope: "user" },
  });
}

/**
 * Respond to an invite (accept/decline). Invalidates invites and groups on success.
 */
export function useRespondToInviteMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    { status: "success"; data?: unknown; message?: string },
    ApiError,
    { inviteId: number; action: "accept" | "decline" }
  >({
    mutationFn: ({ inviteId, action }) => respondToInvite(inviteId, action),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: invitesKeys.lists() });
      if (variables.action === "accept") {
        queryClient.invalidateQueries({ queryKey: groupsKeys.lists() });
      }
    },
  });
}

/**
 * Cancel an invite (inviter only). Invalidates invites list.
 */
export function useCancelInviteMutation(groupId: number) {
  const queryClient = useQueryClient();

  return useMutation<{ status: "success" }, ApiError, number>({
    mutationFn: (inviteId) => cancelInvite(groupId, inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitesKeys.lists() });
    },
  });
}
