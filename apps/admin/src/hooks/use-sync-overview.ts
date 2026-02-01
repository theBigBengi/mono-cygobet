import { useQuery } from "@tanstack/react-query";
import { syncService } from "@/services/sync.service";

export function useSyncOverview() {
  return useQuery({
    queryKey: ["sync-overview"],
    queryFn: () => syncService.getOverview(),
    staleTime: 30_000,
  });
}
