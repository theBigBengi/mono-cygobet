// domains/groups/groups.hooks.ts
// React Query hooks for groups domain.
// - Feature-agnostic: can be used by any feature that needs groups data.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ApiCreateGroupBody,
  ApiUpdateGroupBody,
  ApiPublishGroupBody,
  ApiPublishGroupResponse,
  ApiGroupResponse,
  ApiGroupsResponse,
  ApiGroupFixturesResponse,
  ApiSaveGroupPredictionsBatchBody,
  ApiSaveGroupPredictionsBatchResponse,
} from "@repo/types";
import type { ApiError } from "@/lib/http/apiError";
import { useAuth } from "@/lib/auth/useAuth";
import { isReadyForProtected } from "@/lib/auth/authGuards";
import {
  createGroup,
  fetchMyGroups,
  fetchGroupById,
  updateGroup,
  publishGroup,
  fetchGroupFixtures,
  saveGroupPrediction,
  saveGroupPredictionsBatch,
} from "./groups.api";
import { groupsKeys } from "./groups.keys";

/**
 * Hook to fetch all groups created by the authenticated user.
 * - Enabled only when authenticated and onboarding complete.
 * - Returns groups data with loading/error states.
 */
export function useMyGroupsQuery() {
  const { status, user } = useAuth();

  const enabled = isReadyForProtected(status, user);

  return useQuery<ApiGroupsResponse, ApiError>({
    queryKey: groupsKeys.list(),
    queryFn: () => fetchMyGroups(),
    enabled,
    meta: { scope: "user" },
  });
}

/**
 * Hook to fetch a group by ID.
 * - Enabled only when authenticated and onboarding complete.
 * - Returns group data with loading/error states.
 * - Optionally includes fixtures with predictions when includeFixtures=true.
 */
export function useGroupQuery(
  id: number | null,
  options?: { includeFixtures?: boolean }
) {
  const { status, user } = useAuth();

  // Only enable if id is a valid number (not null, not NaN)
  const enabled =
    isReadyForProtected(status, user) && id !== null && !isNaN(id);

  return useQuery<ApiGroupResponse, ApiError>({
    queryKey: groupsKeys.detail(id!, options?.includeFixtures),
    queryFn: () =>
      fetchGroupById(id!, {
        include: options?.includeFixtures ? "fixtures" : undefined,
      }),
    enabled,
    meta: { scope: "user" },
  });
}

/**
 * Hook to create a new group.
 * - Requires authentication.
 * - Invalidates groups list on success.
 */
export function useCreateGroupMutation() {
  const queryClient = useQueryClient();

  return useMutation<ApiGroupResponse, ApiError, ApiCreateGroupBody>({
    mutationFn: (body) => createGroup(body),
    onSuccess: () => {
      // Invalidate groups list to refetch after creation
      queryClient.invalidateQueries({ queryKey: groupsKeys.lists() });
    },
  });
}

/**
 * Hook to update a group.
 * - Requires authentication.
 * - Invalidates group detail, groups list, and fixtures on success.
 */
export function useUpdateGroupMutation(groupId: number | null) {
  const queryClient = useQueryClient();

  return useMutation<ApiGroupResponse, ApiError, ApiUpdateGroupBody>({
    mutationFn: (body) => {
      if (!groupId) {
        throw new Error("Group ID is required");
      }
      return updateGroup(groupId, body);
    },
    onSuccess: () => {
      // Invalidate group detail, groups list, and fixtures
      if (groupId) {
        queryClient.invalidateQueries({
          queryKey: groupsKeys.detail(groupId),
        });
        // Invalidate fixtures query to refetch with updated fixtures
        queryClient.invalidateQueries({
          queryKey: groupsKeys.fixtures(groupId),
        });
      }
      queryClient.invalidateQueries({ queryKey: groupsKeys.lists() });
    },
  });
}

/**
 * Hook to publish a group (change status from "draft" to "active").
 * - Requires authentication.
 * - Invalidates group detail and groups list on success.
 */
export function usePublishGroupMutation(groupId: number | null) {
  const queryClient = useQueryClient();

  return useMutation<ApiPublishGroupResponse, ApiError, ApiPublishGroupBody>({
    mutationFn: (body) => {
      if (!groupId) {
        throw new Error("Group ID is required");
      }
      return publishGroup(groupId, body);
    },
    onSuccess: () => {
      // Invalidate group detail and groups list
      if (groupId) {
        queryClient.invalidateQueries({
          queryKey: groupsKeys.detail(groupId),
        });
      }
      queryClient.invalidateQueries({ queryKey: groupsKeys.lists() });
    },
  });
}

/**
 * Hook to fetch fixtures attached to a group.
 * - Enabled only when authenticated and onboarding complete.
 */
export function useGroupFixturesQuery(groupId: number | null) {
  const { status, user } = useAuth();

  const enabled =
    isReadyForProtected(status, user) &&
    groupId !== null &&
    !Number.isNaN(groupId);

  return useQuery<ApiGroupFixturesResponse, ApiError>({
    queryKey: groupsKeys.fixtures(groupId ?? 0),
    queryFn: () => fetchGroupFixtures(groupId as number),
    enabled,
    meta: { scope: "user" },
  });
}

/**
 * Hook to save or update a group prediction.
 * - Requires authentication.
 * - Invalidates group fixtures query on success to refetch with updated predictions.
 */
export function useSaveGroupPredictionMutation(groupId: number | null) {
  const queryClient = useQueryClient();

  return useMutation<
    { status: "success"; message: string },
    ApiError,
    { fixtureId: number; prediction: { home: number; away: number } }
  >({
    mutationFn: ({ fixtureId, prediction }) => {
      if (!groupId) {
        throw new Error("Group ID is required");
      }
      return saveGroupPrediction(groupId, fixtureId, prediction);
    },
    onSuccess: () => {
      // Invalidate group fixtures to refetch with updated predictions
      if (groupId) {
        queryClient.invalidateQueries({
          queryKey: groupsKeys.fixtures(groupId),
        });
      }
    },
  });
}

/**
 * Hook to save or update multiple group predictions in a batch.
 * - Requires authentication.
 * - Invalidates group fixtures query on success to refetch with updated predictions.
 */
export function useSaveGroupPredictionsBatchMutation(groupId: number | null) {
  const queryClient = useQueryClient();

  return useMutation<
    ApiSaveGroupPredictionsBatchResponse,
    ApiError,
    ApiSaveGroupPredictionsBatchBody
  >({
    mutationFn: (body) => {
      if (!groupId) {
        throw new Error("Group ID is required");
      }
      return saveGroupPredictionsBatch(groupId, body);
    },
    onSuccess: () => {
      // Invalidate group fixtures to refetch with updated predictions
      if (groupId) {
        queryClient.invalidateQueries({
          queryKey: groupsKeys.fixtures(groupId),
        });
      }
    },
  });
}
