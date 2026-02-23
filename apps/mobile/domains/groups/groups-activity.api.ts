// domains/groups/groups-activity.api.ts
// API functions for group activity feed.

import { apiFetchWithAuthRetry } from "@/lib/http/apiClient";
import type { ApiGroupActivityResponse } from "@repo/types";

/**
 * Fetch paginated activity feed for a specific group.
 */
export async function fetchGroupActivity(
  groupId: number,
  params?: { before?: string; limit?: number }
): Promise<ApiGroupActivityResponse> {
  const searchParams = new URLSearchParams();
  if (params?.before) searchParams.set("before", params.before);
  if (params?.limit != null) searchParams.set("limit", String(params.limit));
  const qs = searchParams.toString();
  return apiFetchWithAuthRetry<ApiGroupActivityResponse>(
    `/api/groups/${groupId}/activity${qs ? `?${qs}` : ""}`
  );
}

/**
 * Fetch unread activity counts for all user's groups.
 */
export async function fetchUnreadActivityCounts(): Promise<{
  status: "success";
  data: Record<string, number>;
}> {
  return apiFetchWithAuthRetry(`/api/groups/activity/unread-counts`);
}

/**
 * Mark activity as read for a group.
 */
export async function markActivityAsRead(
  groupId: number,
  lastReadActivityId: number
): Promise<void> {
  await apiFetchWithAuthRetry(`/api/groups/${groupId}/activity/read`, {
    method: "POST",
    body: { lastReadActivityId },
  });
}
