// domains/groups/groups-predictions.api.ts
// API calls for group predictions and predictions overview.

import type {
  ApiSaveGroupPredictionsBatchBody,
  ApiSaveGroupPredictionsBatchResponse,
  ApiPredictionsOverviewResponse,
} from "@repo/types";
import { apiFetchWithAuthRetry } from "@/lib/http/apiClient";

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
