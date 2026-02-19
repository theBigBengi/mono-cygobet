import { useQuery } from "@tanstack/react-query";
import { syncService } from "@/services/sync.service";

export function useAvailability(opts?: { includeHistorical?: boolean }) {
  const includeHistorical = opts?.includeHistorical ?? false;
  return useQuery({
    queryKey: ["sync-center", "availability", { includeHistorical }],
    queryFn: () => syncService.getAvailability({ includeHistorical }),
    staleTime: 30 * 60_000, // 30 min – data only changes via manual ops, which call invalidateQueries
    gcTime: 60 * 60_000, // 1 hour – survives navigation between pages
  });
}
