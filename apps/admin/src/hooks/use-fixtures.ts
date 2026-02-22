import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { fixturesService } from "@/services/fixtures.service";
import type {
  AdminFixturesAttentionResponse,
  AdminFixturesListResponse,
  AdminProviderFixturesResponse,
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
  const db = useQuery<AdminFixturesListResponse>({
    queryKey: ["fixtures", "live", "db"],
    queryFn: () =>
      fixturesService.getFromDb({
        state: LIVE_STATES,
        perPage: 100,
        include: "homeTeam,awayTeam,league",
      }),
    refetchInterval: 30_000,
  });

  const provider = useQuery<AdminProviderFixturesResponse>({
    queryKey: ["fixtures", "live", "provider"],
    queryFn: () => fixturesService.getLiveFromProvider(),
    refetchInterval: 30_000,
  });

  return { db, provider };
}

type AttentionParams = {
  issueType?: FixtureIssueType | "all";
  search?: string;
  timeframe?: string;
  leagueId?: number;
  page?: number;
  perPage?: number;
};

export function useFixturesAttention(
  params?: AttentionParams,
  options?: { enabled?: boolean }
) {
  const queryClient = useQueryClient();
  const page = params?.page ?? 1;
  const enabled = options?.enabled ?? true;

  const query = useQuery<AdminFixturesAttentionResponse>({
    queryKey: ["fixtures", "attention", params],
    queryFn: () => fixturesService.getAttention(params),
    staleTime: 15 * 60 * 1000, // 15 min — invalidated on sync/resettle
    enabled,
  });

  // Prefetch next page when current page loads
  useEffect(() => {
    if (!enabled || !query.data) return;
    const totalPages = query.data.pagination.totalPages;
    if (page < totalPages) {
      const nextParams: AttentionParams = { ...params, page: page + 1 };
      void queryClient.prefetchQuery({
        queryKey: ["fixtures", "attention", nextParams],
        queryFn: () => fixturesService.getAttention(nextParams),
        staleTime: 15 * 60 * 1000,
      });
    }
  }, [enabled, query.data, page, params, queryClient]);

  return query;
}

type SearchParams = {
  q?: string;
  leagueId?: number;
  fromTs?: number;
  toTs?: number;
  page?: number;
  perPage?: number;
};

export function useFixtureSearch(
  params: SearchParams,
  options?: { enabled?: boolean }
) {
  const queryClient = useQueryClient();
  const page = params.page ?? 1;

  const hasFilter =
    (params.q !== undefined && params.q.length >= 2) ||
    params.leagueId !== undefined ||
    (params.fromTs !== undefined && params.toTs !== undefined);

  const enabled = hasFilter && (options?.enabled ?? true);

  const query = useQuery<AdminFixtureSearchResponse>({
    queryKey: ["fixtures", "search", params],
    queryFn: () => fixturesService.search(params),
    staleTime: 15 * 60 * 1000, // 15 min — invalidated on sync/resettle
    enabled,
  });

  // Prefetch next page when current page loads
  useEffect(() => {
    if (!enabled || !query.data) return;
    const totalPages = query.data.pagination.totalPages;
    if (page < totalPages) {
      const nextParams: SearchParams = { ...params, page: page + 1 };
      void queryClient.prefetchQuery({
        queryKey: ["fixtures", "search", nextParams],
        queryFn: () => fixturesService.search(nextParams),
        staleTime: 15 * 60 * 1000,
      });
    }
  }, [enabled, query.data, page, params, queryClient]);

  return query;
}
