import { useQuery } from "@tanstack/react-query";
import { bookmakersService } from "@/services/bookmakers.service";
import type {
  AdminBookmakersListResponse,
  AdminProviderBookmakersResponse,
} from "@repo/types";

export function useBookmakersFromDb(params?: { page?: number; perPage?: number }) {
  return useQuery<AdminBookmakersListResponse>({
    queryKey: ["bookmakers", "db", params],
    queryFn: () => bookmakersService.getFromDb(params),
    staleTime: 30000, // 30 seconds
  });
}

export function useBookmakersFromProvider() {
  return useQuery<AdminProviderBookmakersResponse>({
    queryKey: ["bookmakers", "provider"],
    queryFn: () => bookmakersService.getFromProvider(),
    staleTime: 30000, // 30 seconds
  });
}

