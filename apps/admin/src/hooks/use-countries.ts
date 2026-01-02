import { useQuery } from "@tanstack/react-query";
import { countriesService } from "@/services/countries.service";
import type {
  AdminCountriesListResponse,
  AdminProviderCountriesResponse,
} from "@repo/types";

export function useCountriesFromDb(params?: {
  page?: number;
  perPage?: number;
  include?: string;
}) {
  return useQuery<AdminCountriesListResponse>({
    queryKey: ["countries", "db", params],
    queryFn: () => countriesService.getFromDb(params),
    staleTime: 30000, // 30 seconds
  });
}

export function useCountriesFromProvider() {
  return useQuery<AdminProviderCountriesResponse>({
    queryKey: ["countries", "provider"],
    queryFn: () => countriesService.getFromProvider(),
    staleTime: 30000, // 30 seconds
  });
}
