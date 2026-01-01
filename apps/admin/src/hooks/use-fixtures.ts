import { useQuery } from "@tanstack/react-query";
import { fixturesService } from "@/services/fixtures.service";
import type {
  AdminFixturesListResponse,
  AdminProviderFixturesResponse,
} from "@repo/types";

export function useFixturesFromDb(params?: {
  page?: number;
  perPage?: number;
  leagueId?: number;
  leagueIds?: number[];
  countryIds?: number[];
  seasonId?: number;
  state?: string;
  include?: string;
}) {
  return useQuery<AdminFixturesListResponse>({
    queryKey: ["fixtures", "db", params],
    queryFn: () => fixturesService.getFromDb(params),
    staleTime: 30000, // 30 seconds
  });
}

export function useFixturesFromProvider(
  from?: string,
  to?: string,
  seasonId?: number,
  leagueIds?: number[],
  countryIds?: number[]
) {
  return useQuery<AdminProviderFixturesResponse>({
    queryKey: [
      "fixtures",
      "provider",
      from,
      to,
      seasonId,
      leagueIds,
      countryIds,
    ],
    queryFn: () =>
      fixturesService.getFromProvider(
        from,
        to,
        seasonId,
        leagueIds,
        countryIds
      ),
    staleTime: 30000, // 30 seconds
    enabled: !!from && !!to, // Only fetch if dates are provided
  });
}
