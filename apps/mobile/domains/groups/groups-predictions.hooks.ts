// domains/groups/groups-predictions.hooks.ts
// React Query hooks for group predictions.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ApiSaveGroupPredictionsBatchBody,
  ApiSaveGroupPredictionsBatchResponse,
  ApiPredictionsOverviewResponse,
} from "@repo/types";
import type { ApiError } from "@/lib/http/apiError";
import { useAuth } from "@/lib/auth/useAuth";
import { isReadyForProtected } from "@/lib/auth/guards";
import {
  saveGroupPrediction,
  saveGroupPredictionsBatch,
  fetchPredictionsOverview,
} from "./groups-predictions.api";
import { groupsKeys } from "./groups.keys";

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
      if (groupId) {
        // Invalidate fixtures, ranking, and predictions overview after saving
        queryClient.invalidateQueries({
          queryKey: groupsKeys.fixtures(groupId),
        });
        queryClient.invalidateQueries({
          queryKey: groupsKeys.predictionsOverview(groupId),
        });
        queryClient.invalidateQueries({
          queryKey: groupsKeys.ranking(groupId),
        });
      }
    },
  });
}

/**
 * Hook to fetch predictions overview for a group.
 * - Enabled only when authenticated and onboarding complete and groupId is valid.
 * - Returns predictions overview data with loading/error states.
 */
export function usePredictionsOverviewQuery(groupId: number | null) {
  const { status, user } = useAuth();

  const enabled =
    isReadyForProtected(status, user) &&
    groupId !== null &&
    !Number.isNaN(groupId);

  return useQuery<ApiPredictionsOverviewResponse, ApiError>({
    queryKey: groupsKeys.predictionsOverview(groupId ?? 0),
    queryFn: () => fetchPredictionsOverview(groupId as number),
    enabled,
    meta: { scope: "user" },
  });
}
