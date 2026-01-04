import { useInfiniteQuery } from "@tanstack/react-query";
import { getUpcoming } from "@/services/fixtures-service";

export type UpcomingFixturesParams = {
  from?: string; // ISO datetime
  to?: string; // ISO datetime
  perPage?: number;
};

export function useUpcomingFixtures(params: UpcomingFixturesParams) {
  const perPage = params.perPage ?? 30;

  return useInfiniteQuery({
    queryKey: ["fixtures", "upcoming", { ...params, perPage }],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getUpcoming({
        from: params.from,
        to: params.to,
        page: pageParam,
        perPage,
      }),
    getNextPageParam: (lastPage, allPages) => {
      const lastData = lastPage.data ?? [];

      // If the backend provides totals, trust them.
      const totalPages = lastPage.pagination?.totalPages;
      if (typeof totalPages === "number") {
        return allPages.length < totalPages ? allPages.length + 1 : undefined;
      }

      // Otherwise: stop when the last page isn't full.
      return lastData.length >= perPage ? allPages.length + 1 : undefined;
    },
    staleTime: 30_000,
    gcTime: 2 * 60_000,
  });
}


