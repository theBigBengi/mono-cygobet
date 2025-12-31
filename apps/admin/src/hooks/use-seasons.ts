import { useQuery } from "@tanstack/react-query";
import { seasonsService } from "@/services/seasons.service";
import type {
  AdminSeasonsListResponse,
  AdminProviderSeasonsResponse,
} from "@repo/types";

export function useSeasonsFromDb(params?: { 
  page?: number; 
  perPage?: number; 
  leagueId?: number;
  isCurrent?: boolean;
  include?: string;
}) {
  return useQuery<AdminSeasonsListResponse>({
    queryKey: ["seasons", "db", params],
    queryFn: () => seasonsService.getFromDb(params),
    staleTime: 30000, // 30 seconds
  });
}

export function useSeasonsFromProvider() {
  return useQuery<AdminProviderSeasonsResponse>({
    queryKey: ["seasons", "provider"],
    queryFn: () => seasonsService.getFromProvider(),
    staleTime: 30000, // 30 seconds
  });
}

