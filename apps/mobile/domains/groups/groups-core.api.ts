// domains/groups/groups-core.api.ts
// Core group CRUD, listing, and fixture operations.
// - Encapsulates HTTP calls for group lifecycle.
// - Feature-agnostic: no knowledge of who uses it.

import type {
  ApiCreateGroupBody,
  ApiUpdateGroupBody,
  ApiPublishGroupBody,
  ApiPublishGroupResponse,
  ApiGroupResponse,
  ApiGroupsResponse,
  ApiPublicGroupsQuery,
  ApiPublicGroupsResponse,
  ApiGroupFixturesResponse,
  ApiGroupGamesFiltersResponse,
  ApiGroupPreviewBody,
  ApiGroupPreviewResponse,
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
 * Fetch public groups (paginated, optional search by name).
 * - Requires authentication.
 * - Excludes groups the user is already a member of.
 */
export async function fetchPublicGroups(
  params: ApiPublicGroupsQuery
): Promise<ApiPublicGroupsResponse> {
  const queryString = buildQuery({
    page: params.page,
    perPage: params.perPage,
    search: params.search,
  });
  return apiFetchWithAuthRetry<ApiPublicGroupsResponse>(
    `/api/groups/public${queryString}`,
    { method: "GET" }
  );
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
 * Preview group selection — returns summary stats (fixture count, date range, etc.).
 * Does NOT create a group. Read-only preview.
 */
export async function fetchGroupPreview(
  body: ApiGroupPreviewBody
): Promise<ApiGroupPreviewResponse> {
  return apiFetchWithAuthRetry<ApiGroupPreviewResponse>("/api/groups/preview", {
    method: "POST",
    body,
  });
}
