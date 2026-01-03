import { useQuery } from "@tanstack/react-query";
import { oddsService } from "@/services/odds.service";
import type { AdminOddsListResponse, AdminProviderOddsResponse } from "@repo/types";

export function useOddsFromDb(params?: {
  page?: number;
  perPage?: number;
  fixtureIds?: string[];
  bookmakerIds?: string[];
  marketIds?: string[];
  winning?: boolean;
  fromTs?: number;
  toTs?: number;
}) {
  return useQuery<AdminOddsListResponse>({
    queryKey: ["odds", "db", params],
    queryFn: () => oddsService.getFromDb(params),
    staleTime: 30000,
  });
}

export function useOddsFromProvider(params?: {
  from?: string;
  to?: string;
  bookmakerIds?: string[];
  marketIds?: string[];
  fixtureStates?: string[];
}) {
  return useQuery<AdminProviderOddsResponse>({
    queryKey: ["odds", "provider", params],
    queryFn: () => oddsService.getFromProvider(params),
    staleTime: 30000,
  });
}

