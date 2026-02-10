// domains/groups/groups-members.api.ts
// API calls for group members, ranking, and nudge.

import type {
  ApiRankingResponse,
  ApiGroupMembersResponse,
  ApiNudgeBody,
  ApiNudgeResponse,
  ApiLeaveGroupResponse,
} from "@repo/types";
import { apiFetchWithAuthRetry } from "@/lib/http/apiClient";

/**
 * Fetch group members.
 * - Requires authentication.
 * - Verifies that the user is a group member.
 * - Returns list of joined members with userId, username, role, joinedAt.
 */
export async function fetchGroupMembers(
  groupId: number
): Promise<ApiGroupMembersResponse> {
  return apiFetchWithAuthRetry<ApiGroupMembersResponse>(
    `/api/groups/${groupId}/members`,
    { method: "GET" }
  );
}

/**
 * Fetch group ranking.
 * - Requires authentication.
 * - Verifies that the user is a group member.
 * - Returns ranking with all joined members and aggregated stats.
 */
export async function fetchGroupRanking(
  groupId: number
): Promise<ApiRankingResponse> {
  return apiFetchWithAuthRetry<ApiRankingResponse>(
    `/api/groups/${groupId}/ranking`,
    {
      method: "GET",
    }
  );
}

/**
 * Send a nudge to a group member for a fixture (remind them to predict).
 * - Requires authentication.
 * - Verifies that the user is a group member.
 * - Returns 201 on success, 409 if already nudged.
 */
/**
 * Leave a group.
 * - Requires authentication.
 * - User must be a member (not creator).
 */
export async function leaveGroup(
  groupId: number
): Promise<ApiLeaveGroupResponse> {
  return apiFetchWithAuthRetry<ApiLeaveGroupResponse>(
    `/api/groups/${groupId}/leave`,
    { method: "POST" }
  );
}

export async function sendNudge(
  groupId: number,
  body: ApiNudgeBody
): Promise<ApiNudgeResponse> {
  return apiFetchWithAuthRetry<ApiNudgeResponse>(
    `/api/groups/${groupId}/nudge`,
    {
      method: "POST",
      body,
    }
  );
}
