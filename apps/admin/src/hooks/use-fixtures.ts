import { useQuery } from "@tanstack/react-query";
import { fixturesService } from "@/services/fixtures.service";
import type {
  AdminFixturesAttentionResponse,
  AdminFixtureSearchResponse,
  FixtureIssueType,
} from "@repo/types";

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
