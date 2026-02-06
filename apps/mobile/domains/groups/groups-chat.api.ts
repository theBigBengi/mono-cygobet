import { apiFetchWithAuthRetry } from "@/lib/http/apiClient";
import type { ChatMessage } from "@/lib/socket";
import type { GroupChatPreviewResponse } from "@repo/types";

interface GetMessagesResponse {
  data: ChatMessage[];
}

interface UnreadCountsResponse {
  data: Record<string, number>;
}

/**
 * Fetch messages for a group with cursor-based pagination.
 * - Requires authentication and onboarding complete.
 */
export async function fetchGroupMessages(
  groupId: number,
  opts?: { before?: number; limit?: number }
): Promise<GetMessagesResponse> {
  const params = new URLSearchParams();
  if (opts?.before) params.set("before", String(opts.before));
  if (opts?.limit) params.set("limit", String(opts.limit));
  const qs = params.toString();

  return apiFetchWithAuthRetry<GetMessagesResponse>(
    `/api/groups/${groupId}/messages${qs ? `?${qs}` : ""}`
  );
}

/**
 * Fetch unread message counts for all of the user's joined groups.
 * - Requires authentication and onboarding complete.
 * - Returns Record<groupId, count> (keys are stringified in JSON).
 */
export async function fetchUnreadCounts(): Promise<UnreadCountsResponse> {
  return apiFetchWithAuthRetry<UnreadCountsResponse>(
    "/api/groups/unread-counts"
  );
}

/**
 * Fetch chat preview (unread count + last message) for all of the user's joined groups.
 * - Requires authentication and onboarding complete.
 */
export async function fetchGroupChatPreview(): Promise<GroupChatPreviewResponse> {
  return apiFetchWithAuthRetry<GroupChatPreviewResponse>(
    "/api/groups/chat/preview"
  );
}

/**
 * Mark messages as read up to lastReadMessageId for a group.
 * - Requires authentication and onboarding complete.
 */
export async function markMessagesAsRead(
  groupId: number,
  lastReadMessageId: number
): Promise<void> {
  await apiFetchWithAuthRetry(`/api/groups/${groupId}/messages/read`, {
    method: "POST",
    body: { lastReadMessageId },
  });
}
