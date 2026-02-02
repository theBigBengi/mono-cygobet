// features/group-creation/filters/useFixtureFilters.ts
// Filter state hook: date range + league IDs → API query params for upcoming fixtures.

import { useMemo, useState, useCallback } from "react";
import type { ApiUpcomingFixturesQuery } from "@repo/types";

export type DateRangeKey =
  | "today"
  | "tomorrow"
  | "3days"
  | "week"
  | "all";

function getDateBounds(range: DateRangeKey): { from?: string; to?: string } {
  const now = new Date();
  if (range === "all") return {};

  if (range === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { from: start.toISOString(), to: end.toISOString() };
  }

  if (range === "tomorrow") {
    const start = new Date(now);
    start.setDate(now.getDate() + 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { from: start.toISOString(), to: end.toISOString() };
  }

  if (range === "3days") {
    const end = new Date(now);
    end.setDate(now.getDate() + 3);
    return { from: now.toISOString(), to: end.toISOString() };
  }

  if (range === "week") {
    const end = new Date(now);
    end.setDate(now.getDate() + 7);
    return { from: now.toISOString(), to: end.toISOString() };
  }

  return {};
}

export function useFixtureFilters() {
  const [dateRange, setDateRangeState] = useState<DateRangeKey>("all");
  const [selectedLeagueIds, setSelectedLeagueIds] = useState<number[]>([]);

  const queryParams = useMemo<ApiUpcomingFixturesQuery>(() => {
    const { from, to } = getDateBounds(dateRange);
    const params: ApiUpcomingFixturesQuery = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (selectedLeagueIds.length > 0) params.leagues = selectedLeagueIds;
    return params;
  }, [dateRange, selectedLeagueIds]);

  const activeFilterCount = selectedLeagueIds.length;

  const setDateRange = useCallback((range: DateRangeKey) => {
    setDateRangeState(range);
  }, []);

  const toggleLeague = useCallback((id: number) => {
    setSelectedLeagueIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const setLeagues = useCallback((ids: number[]) => {
    setSelectedLeagueIds(ids);
  }, []);

  const clearLeagues = useCallback(() => {
    setSelectedLeagueIds([]);
  }, []);

  const clearAll = useCallback(() => {
    setDateRangeState("all");
    setSelectedLeagueIds([]);
  }, []);

  return {
    dateRange,
    selectedLeagueIds,
    queryParams,
    activeFilterCount,
    setDateRange,
    toggleLeague,
    setLeagues,
    clearLeagues,
    clearAll,
  };
}
