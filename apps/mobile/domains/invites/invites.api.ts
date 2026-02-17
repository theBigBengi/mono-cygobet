// domains/invites/invites.api.ts
// API calls for user search and group invites.

import type {
  ApiUsersSearchResponse,
  ApiSendInviteResponse,
  ApiUserInvitesResponse,
  ApiRespondToInviteResponse,
} from "@repo/types";
import { apiFetchWithAuthRetry } from "@/lib/http/apiClient";

export interface UsersSearchParams {
  q: string;
  excludeGroupId?: number;
  page?: number;
  perPage?: number;
}

/**
 * Search users by username (for inviting to group).
 * Min 3 characters. Requires auth.
 */
export async function searchUsers(
  params: UsersSearchParams
): Promise<ApiUsersSearchResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set("q", params.q.trim());
  if (params.excludeGroupId != null) {
    searchParams.set("excludeGroupId", String(params.excludeGroupId));
  }
  if (params.page != null) searchParams.set("page", String(params.page));
  if (params.perPage != null)
    searchParams.set("perPage", String(params.perPage));
  return apiFetchWithAuthRetry<ApiUsersSearchResponse>(
    `/api/users/search?${searchParams.toString()}`,
    { method: "GET" }
  );
}

export interface SuggestedUsersParams {
  excludeGroupId?: number;
}

/**
 * Get suggested users from shared private groups.
 */
export async function getSuggestedUsers(
  params?: SuggestedUsersParams
): Promise<ApiUsersSearchResponse> {
  const searchParams = new URLSearchParams();
  if (params?.excludeGroupId != null) {
    searchParams.set("excludeGroupId", String(params.excludeGroupId));
  }
  const qs = searchParams.toString();
  return apiFetchWithAuthRetry<ApiUsersSearchResponse>(
    `/api/users/suggested${qs ? `?${qs}` : ""}`,
    { method: "GET" }
  );
}

/**
 * Send a group invite. Requires auth; caller must be group member.
 */
export async function sendInvite(
  groupId: number,
  userId: number,
  message?: string
): Promise<ApiSendInviteResponse> {
  return apiFetchWithAuthRetry<ApiSendInviteResponse>(
    `/api/groups/${groupId}/invites`,
    {
      method: "POST",
      body: { userId, message },
    }
  );
}

export interface MyInvitesParams {
  status?: "pending" | "accepted" | "declined" | "expired" | "cancelled";
}

/**
 * Get current user's invites. Requires auth.
 */
export async function getMyInvites(
  params?: MyInvitesParams
): Promise<ApiUserInvitesResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  const qs = searchParams.toString();
  return apiFetchWithAuthRetry<ApiUserInvitesResponse>(
    `/api/users/invites${qs ? `?${qs}` : ""}`,
    { method: "GET" }
  );
}

/**
 * Accept or decline an invite. Requires auth; invite must belong to current user.
 */
export async function respondToInvite(
  inviteId: number,
  action: "accept" | "decline"
): Promise<
  ApiRespondToInviteResponse | { status: "success"; message?: string }
> {
  return apiFetchWithAuthRetry(`/api/users/invites/${inviteId}/respond`, {
    method: "POST",
    body: { action },
  });
}

/**
 * Cancel an invite (inviter only). Requires auth.
 */
export async function cancelInvite(
  groupId: number,
  inviteId: number
): Promise<{ status: "success" }> {
  return apiFetchWithAuthRetry(`/api/groups/${groupId}/invites/${inviteId}`, {
    method: "DELETE",
  });
}

export interface SentInviteItem {
  id: number;
  inviteeId: number;
  inviteeUsername: string | null;
  inviteeImage: string | null;
  message: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface SentInvitesResponse {
  status: "success";
  data: SentInviteItem[];
}

/**
 * Get pending invites sent by current user for a specific group.
 */
export async function getSentInvites(
  groupId: number
): Promise<SentInvitesResponse> {
  return apiFetchWithAuthRetry<SentInvitesResponse>(
    `/api/groups/${groupId}/invites/sent`,
    { method: "GET" }
  );
}
