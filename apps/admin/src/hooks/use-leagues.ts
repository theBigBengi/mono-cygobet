import { useQuery } from "@tanstack/react-query";
import { leaguesService } from "@/services/leagues.service";
import type {
  AdminLeaguesListResponse,
  AdminProviderLeaguesResponse,
} from "@repo/types";

export function useLeaguesFromDb(params?: { 
  page?: number; 
  perPage?: number; 
  countryId?: number;
  type?: string;
  include?: string;
}) {
  return useQuery<AdminLeaguesListResponse>({
    queryKey: ["leagues", "db", params],
    queryFn: () => leaguesService.getFromDb(params),
    staleTime: 30000, // 30 seconds
  });
}

export function useLeaguesFromProvider() {
  return useQuery<AdminProviderLeaguesResponse>({
    queryKey: ["leagues", "provider"],
    queryFn: () => leaguesService.getFromProvider(),
    staleTime: 30000, // 30 seconds
  });
}

