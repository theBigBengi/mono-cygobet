// domains/groups/groups.api.ts
// Domain API module for groups.
// - Encapsulates HTTP calls for groups data.
// - Feature-agnostic: no knowledge of who uses it.

import type {
  ApiCreateGroupBody,
  ApiUpdateGroupBody,
  ApiPublishGroupBody,
  ApiPublishGroupResponse,
  ApiGroupResponse,
  ApiGroupsResponse,
  ApiGroupFixturesResponse,
  ApiGroupGamesFiltersResponse,
  ApiSaveGroupPredictionsBatchBody,
  ApiSaveGroupPredictionsBatchResponse,
  ApiPredictionsOverviewResponse,
  ApiRankingResponse,
  ApiGroupMembersResponse,
  ApiInviteCodeResponse,
} from "@repo/types";
import { apiFetchWithAuthRetry } from "@/lib/http/apiClient";
import { buildQuery } from "@/lib/http/queryBuilder";

/**
 * Create a new group.
 * - Requires authentication.
 * - Returns the created group.
 */
export async function createGroup(
  body: ApiCreateGroupBody
): Promise<ApiGroupResponse> {
  return apiFetchWithAuthRetry<ApiGroupResponse>("/api/groups", {
    method: "POST",
    body,
  });
}

/**
 * Fetch all groups created by the authenticated user.
 * - Requires authentication.
 * - Returns list of groups sorted by createdAt DESC.
 */
export async function fetchMyGroups(): Promise<ApiGroupsResponse> {
  return apiFetchWithAuthRetry<ApiGroupsResponse>("/api/groups", {
    method: "GET",
  });
}

/**
 * Fetch a group by ID.
 * - Requires authentication.
 * - Returns the group if user is the creator.
 * - Optionally includes fixtures with predictions when include="fixtures".
 */
export async function fetchGroupById(
  id: number,
  options?: { include?: "fixtures" }
): Promise<ApiGroupResponse> {
  const queryString = buildQuery(
    options?.include ? { include: options.include } : {}
  );
  return apiFetchWithAuthRetry<ApiGroupResponse>(
    `/api/groups/${id}${queryString}`,
    {
      method: "GET",
    }
  );
}

/**
 * Update a group.
 * - Requires authentication.
 * - Returns the updated group.
 * - Only updates fields that are provided.
 */
export async function updateGroup(
  id: number,
  body: ApiUpdateGroupBody
): Promise<ApiGroupResponse> {
  return apiFetchWithAuthRetry<ApiGroupResponse>(`/api/groups/${id}`, {
    method: "PATCH",
    body,
  });
}

/**
 * Publish a group (change status from "draft" to "active" and update name/privacy).
 * - Requires authentication.
 * - Returns the published group.
 * - Only works for draft groups.
 */
export async function publishGroup(
  id: number,
  body: ApiPublishGroupBody
): Promise<ApiPublishGroupResponse> {
  return apiFetchWithAuthRetry<ApiPublishGroupResponse>(
    `/api/groups/${id}/publish`,
    {
      method: "POST",
      body,
    }
  );
}

/**
 * Fetch fixtures attached to a specific group.
 * - Requires authentication.
 */
export async function fetchGroupFixtures(
  id: number
): Promise<ApiGroupFixturesResponse> {
  return apiFetchWithAuthRetry<ApiGroupFixturesResponse>(
    `/api/groups/${id}/fixtures`,
    {
      method: "GET",
    }
  );
}

/**
 * Fetch games-filters (rounds, leagues with currentSeason) for a group.
 * - Requires authentication.
 * - Verifies that the user is the creator.
 */
export async function fetchGroupGamesFilters(
  groupId: number
): Promise<ApiGroupGamesFiltersResponse> {
  return apiFetchWithAuthRetry<ApiGroupGamesFiltersResponse>(
    `/api/groups/${groupId}/games-filters`,
    { method: "GET" }
  );
}

/**
 * Save or update a prediction for a specific fixture in a group.
 * - Requires authentication.
 * - Verifies that the user is a group member.
 */
export async function saveGroupPrediction(
  groupId: number,
  fixtureId: number,
  prediction: { home: number; away: number }
): Promise<{ status: "success"; message: string }> {
  return apiFetchWithAuthRetry<{ status: "success"; message: string }>(
    `/api/groups/${groupId}/predictions/${fixtureId}`,
    {
      method: "PUT",
      body: prediction,
    }
  );
}

/**
 * Save or update multiple predictions for fixtures in a group in a single batch request.
 * - Requires authentication.
 * - Verifies that the user is a group member.
 * - Updates all predictions in a single transaction.
 */
export async function saveGroupPredictionsBatch(
  groupId: number,
  body: ApiSaveGroupPredictionsBatchBody
): Promise<ApiSaveGroupPredictionsBatchResponse> {
  return apiFetchWithAuthRetry<ApiSaveGroupPredictionsBatchResponse>(
    `/api/groups/${groupId}/predictions`,
    {
      method: "PUT",
      body,
    }
  );
}

/**
 * Delete a group.
 * - Requires authentication.
 * - Verifies that the user is the creator.
 * - Returns success message.
 */
export async function deleteGroup(
  id: number
): Promise<{ status: "success"; message: string }> {
  return apiFetchWithAuthRetry<{ status: "success"; message: string }>(
    `/api/groups/${id}`,
    {
      method: "DELETE",
      body: {}, // Send empty body to satisfy Fastify's JSON parser
    }
  );
}

/**
 * Fetch predictions overview for a group.
 * - Requires authentication.
 * - Verifies that the user is a group member.
 * - Returns all participants, fixtures, and predictions.
 */
export async function fetchPredictionsOverview(
  groupId: number
): Promise<ApiPredictionsOverviewResponse> {
  return apiFetchWithAuthRetry<ApiPredictionsOverviewResponse>(
    `/api/groups/${groupId}/predictions-overview`,
    {
      method: "GET",
    }
  );
}

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
 * Join a group by invite code.
 * - Requires authentication.
 * - Body: { code }. Returns the joined group.
 */
export async function joinGroupByCode(
  code: string
): Promise<ApiGroupResponse> {
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
