import { useQuery } from "@tanstack/react-query";
import { syncService } from "@/services/sync.service";

export function useAvailability() {
  return useQuery({
    queryKey: ["sync-center", "availability"],
    queryFn: () => syncService.getAvailability(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
