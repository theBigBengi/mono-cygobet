import { useQuery } from "@tanstack/react-query";
import { marketsService } from "@/services/markets.service";
import type { AdminProviderMarketsResponse } from "@repo/types";

export function useMarketsFromProvider() {
  return useQuery<AdminProviderMarketsResponse>({
    queryKey: ["markets", "provider"],
    queryFn: () => marketsService.getFromProvider(),
    staleTime: Infinity,
  });
}
