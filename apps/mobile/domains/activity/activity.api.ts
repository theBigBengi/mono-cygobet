import { apiFetchWithAuthRetry } from "@/lib/http/apiClient";
import type { ApiActivityFeedResponse } from "@repo/types";

/**
 * Fetch activity feed (cross-group system events) with cursor-based pagination.
 * - Requires authentication and onboarding complete.
 */
export async function fetchActivityFeed(params?: {
  before?: string;
  limit?: number;
}): Promise<ApiActivityFeedResponse> {
  const searchParams = new URLSearchParams();
  if (params?.before) searchParams.set("before", params.before);
  if (params?.limit != null) searchParams.set("limit", String(params.limit));
  const qs = searchParams.toString();
  return apiFetchWithAuthRetry<ApiActivityFeedResponse>(
    `/api/activity${qs ? `?${qs}` : ""}`
  );
}
