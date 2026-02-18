import { useQuery } from "@tanstack/react-query";
import { fixturesService } from "@/services/fixtures.service";
import type {
  AdminFixturesListResponse,
  AdminProviderFixturesResponse,
} from "@repo/types";

export function useFixturesFromDb(
  params?: {
    page?: number;
    perPage?: number;
    leagueId?: number;
    leagueIds?: string[]; // External IDs
    countryIds?: string[]; // External IDs
    seasonId?: number;
    state?: string;
    include?: string;
    fromTs?: number; // Start timestamp filter
    toTs?: number; // End timestamp filter
    dataQuality?: "noScores";
  },
  options?: { enabled?: boolean }
) {
  return useQuery<AdminFixturesListResponse>({
    queryKey: ["fixtures", "db", params],
    queryFn: () => fixturesService.getFromDb(params),
    staleTime: 30000, // 30 seconds
    enabled: options?.enabled ?? true,
  });
}

export function useFixturesFromProvider(
  from?: string,
  to?: string,
  seasonId?: number,
  leagueIds?: string[], // External IDs
  countryIds?: string[], // External IDs
  options?: { enabled?: boolean }
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
    enabled: !!from && !!to && (options?.enabled !== false),
  });
}
