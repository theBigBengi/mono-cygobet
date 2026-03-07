// domains/groups/groups-activity.hooks.ts
// React Query hooks for group activity feed.

import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useAuth } from "@/lib/auth/useAuth";
import { useAppIsActive } from "@/lib/hooks/useAppIsActive";
import { isReadyForProtected } from "@/lib/auth/guards";
import {
  fetchGroupActivity,
  fetchUnreadActivityCounts,
  markActivityAsRead,
} from "./groups-activity.api";
import { groupsKeys } from "./groups.keys";

const FEED_PAGE_SIZE = 30;

/**
 * Infinite query for a group's activity feed with cursor-based pagination.
 */
export function useGroupActivityQuery(groupId: number | null) {
  const { status, user } = useAuth();
  const enabled = isReadyForProtected(status, user) && groupId != null;

  return useInfiniteQuery({
    queryKey: groupsKeys.activity(groupId!),
    queryFn: async ({ pageParam }) => {
      return await fetchGroupActivity(groupId!, {
        before: pageParam,
        limit: FEED_PAGE_SIZE,
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      const items = lastPage.data.items;
      if (items.length < FEED_PAGE_SIZE) return undefined;
      const lastItem = items[items.length - 1];
      return lastItem?.createdAt ?? undefined;
    },
    enabled,
  });
}

/**
 * Fetch unread activity counts for all user's groups.
 * Returns Record<groupId, count>.
 */
export function useUnreadActivityCountsQuery() {
  const { status, user } = useAuth();
  const isActive = useAppIsActive();
  const enabled = isReadyForProtected(status, user);

  return useQuery({
    queryKey: groupsKeys.unreadActivityCounts(),
    queryFn: () => fetchUnreadActivityCounts(),
    enabled,
    staleTime: 30_000,
    refetchInterval: isActive ? 60_000 : false,
    meta: { scope: "user" } as const,
  });
}

/**
 * Returns a markAsRead callback that optimistically clears the badge
 * and persists via HTTP.
 */
export function useMarkActivityAsRead(groupId: number | null) {
  const queryClient = useQueryClient();

  return useCallback(
    async (lastReadActivityId: number) => {
      if (!groupId) return;

      // Optimistic: set count to 0 for this group
      queryClient.setQueryData(
        groupsKeys.unreadActivityCounts(),
        (old: { status: string; data: Record<string, number> } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            data: { ...old.data, [String(groupId)]: 0 },
          };
        }
      );

      try {
        await markActivityAsRead(groupId, lastReadActivityId);
      } catch {
        queryClient.invalidateQueries({
          queryKey: groupsKeys.unreadActivityCounts(),
        });
      }
    },
    [groupId, queryClient]
  );
}
