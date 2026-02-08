// domains/groups/groups-invite.api.ts
// API calls for group invite codes and joining groups.

import type {
  ApiGroupResponse,
  ApiInviteCodeResponse,
} from "@repo/types";
import { apiFetchWithAuthRetry } from "@/lib/http/apiClient";

/**
 * Join a group by invite code.
 * - Requires authentication.
 * - Body: { code }. Returns the joined group.
 */
export async function joinGroupByCode(code: string): Promise<ApiGroupResponse> {
  return apiFetchWithAuthRetry<ApiGroupResponse>("/api/groups/join", {
    method: "POST",
    body: { code },
  });
}

/**
 * Join a public group by ID.
 * - Requires authentication.
 * - Returns the joined group.
 */
export async function joinPublicGroup(
  groupId: number
): Promise<ApiGroupResponse> {
  return apiFetchWithAuthRetry<ApiGroupResponse>(
    `/api/groups/${groupId}/join`,
    {
      method: "POST",
      body: {},
    }
  );
}

/**
 * Fetch invite code for a group (creator only).
 * - Requires authentication.
 * - Group must be active.
 */
export async function fetchInviteCode(
  groupId: number
): Promise<ApiInviteCodeResponse> {
  return apiFetchWithAuthRetry<ApiInviteCodeResponse>(
    `/api/groups/${groupId}/invite-code`,
    { method: "GET" }
  );
}

/**
 * Regenerate invite code for a group (creator only).
 * - Requires authentication.
 * - Group must be active.
 */
export async function regenerateInviteCode(
  groupId: number
): Promise<ApiInviteCodeResponse> {
  return apiFetchWithAuthRetry<ApiInviteCodeResponse>(
    `/api/groups/${groupId}/invite-code`,
    {
      method: "POST",
      body: {},
    }
  );
}
