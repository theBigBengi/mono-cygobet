import { useQuery } from "@tanstack/react-query";
import { teamsService } from "@/services/teams.service";
import type {
  AdminTeamsListResponse,
  AdminProviderTeamsResponse,
} from "@repo/types";

export function useTeamsFromDb(params?: { 
  page?: number; 
  perPage?: number; 
  countryId?: number;
  type?: string;
  include?: string;
}) {
  return useQuery<AdminTeamsListResponse>({
    queryKey: ["teams", "db", params],
    queryFn: () => teamsService.getFromDb(params),
    staleTime: 30000, // 30 seconds
  });
}

export function useTeamsFromProvider() {
  return useQuery<AdminProviderTeamsResponse>({
    queryKey: ["teams", "provider"],
    queryFn: () => teamsService.getFromProvider(),
    staleTime: 30000, // 30 seconds
  });
}

