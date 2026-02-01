import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/useAuth";
import { isReadyForProtected } from "@/lib/auth/guards";
import { fetchActivityFeed } from "./activity.api";
import { activityKeys } from "./activity.keys";

const FEED_PAGE_SIZE = 20;

/**
 * Infinite query for activity feed with cursor-based pagination (before = ISO datetime).
 */
export function useActivityFeedQuery() {
  const { status, user } = useAuth();
  const enabled = isReadyForProtected(status, user);

  return useInfiniteQuery({
    queryKey: activityKeys.feed(),
    queryFn: async ({ pageParam }) => {
      const res = await fetchActivityFeed({
        before: pageParam,
        limit: FEED_PAGE_SIZE,
      });
      return res;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      const items = lastPage.data.items;
      if (items.length < FEED_PAGE_SIZE) return undefined;
      const lastItem = items[items.length - 1];
      return lastItem?.createdAt ?? undefined;
    },
    enabled,
    meta: { scope: "user" } as const,
  });
}
