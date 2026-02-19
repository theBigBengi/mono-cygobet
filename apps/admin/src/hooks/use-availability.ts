import { useQuery } from "@tanstack/react-query";
import { syncService } from "@/services/sync.service";

export function useAvailability(opts?: { includeHistorical?: boolean }) {
  const includeHistorical = opts?.includeHistorical ?? false;

  // Fast query — skips fixture checks, loads instantly
  const fast = useQuery({
    queryKey: ["sync-center", "availability", { includeHistorical, fast: true }],
    queryFn: () =>
      syncService.getAvailability({ includeHistorical, skipFixtureCheck: true }),
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
  });

  // Enriched query — includes fixture availability, runs in background
  const enriched = useQuery({
    queryKey: [
      "sync-center",
      "availability",
      { includeHistorical, fast: false },
    ],
    queryFn: () => syncService.getAvailability({ includeHistorical }),
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
  });

  // Return enriched data when available, fall back to fast
  return {
    ...fast,
    data: enriched.data ?? fast.data,
    isLoading: fast.isLoading, // only "loading" while fast query loads
  };
}
