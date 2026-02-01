import { useQuery } from "@tanstack/react-query";
import { seasonsService } from "@/services/seasons.service";

/**
 * Fetches DB seasons for the fixtures page season filter dropdown.
 * Returns current and recent seasons (e.g. for "Sync Filtered" with seasonId).
 */
export function useSeasonsForFilter() {
  return useQuery({
    queryKey: ["seasons", "filter"],
    queryFn: () =>
      seasonsService.getFromDb({
        perPage: 50,
        page: 1,
      }),
    staleTime: 60_000,
  });
}
