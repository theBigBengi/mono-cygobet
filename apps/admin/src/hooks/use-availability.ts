import { useQuery } from "@tanstack/react-query";
import { syncService } from "@/services/sync.service";

export function useAvailability(opts?: { includeHistorical?: boolean }) {
  const includeHistorical = opts?.includeHistorical ?? false;
  return useQuery({
    queryKey: ["sync-center", "availability", { includeHistorical }],
    queryFn: () => syncService.getAvailability({ includeHistorical }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
