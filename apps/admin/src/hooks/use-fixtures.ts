import { useQuery } from "@tanstack/react-query";
import { fixturesService } from "@/services/fixtures.service";
import type {
  AdminFixturesAttentionResponse,
  AdminFixturesListResponse,
  AdminFixtureSearchResponse,
  FixtureIssueType,
} from "@repo/types";

const LIVE_STATES = [
  "INPLAY_1ST_HALF",
  "INPLAY_2ND_HALF",
  "INPLAY_ET",
  "INPLAY_PENALTIES",
  "HT",
  "BREAK",
  "EXTRA_TIME_BREAK",
  "PEN_BREAK",
].join(",");

export function useLiveFixtures() {
  return useQuery<AdminFixturesListResponse>({
    queryKey: ["fixtures", "live"],
    queryFn: () =>
      fixturesService.getFromDb({
        state: LIVE_STATES,
        perPage: 100,
        include: "homeTeam,awayTeam,league",
      }),
    refetchInterval: 30_000, // refresh every 30s while live
  });
}

export function useFixturesAttention(
  params?: {
    issueType?: FixtureIssueType | "all";
    page?: number;
    perPage?: number;
  },
  options?: { enabled?: boolean }
) {
  return useQuery<AdminFixturesAttentionResponse>({
    queryKey: ["fixtures", "attention", params],
    queryFn: () => fixturesService.getAttention(params),
    staleTime: 15 * 60 * 1000, // 15 min — invalidated on sync/resettle
    enabled: options?.enabled ?? true,
  });
}

export function useFixtureSearch(
  query: string,
  params?: { page?: number; perPage?: number },
  options?: { enabled?: boolean }
) {
  return useQuery<AdminFixtureSearchResponse>({
    queryKey: ["fixtures", "search", query, params],
    queryFn: () =>
      fixturesService.search({ q: query, ...params }),
    staleTime: 15 * 60 * 1000, // 15 min — invalidated on sync/resettle
    enabled: query.length >= 2 && (options?.enabled ?? true),
  });
}
