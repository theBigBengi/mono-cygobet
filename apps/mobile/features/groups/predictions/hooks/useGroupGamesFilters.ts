// hooks/useGroupGamesFilters.ts
// Hook to calculate filter availability for group games

import { useMemo } from "react";
import type { FixtureItem } from "@/types/common";

interface UseGroupGamesFiltersProps {
  fixtures: FixtureItem[];
  isTeamsMode: boolean;
  isGamesMode: boolean;
}

/**
 * Hook to calculate which filters should be available based on fixtures.
 * Returns flags for Today and This Week filters.
 */
export function useGroupGamesFilters({
  fixtures,
  isTeamsMode,
  isGamesMode,
}: UseGroupGamesFiltersProps) {
  // Check if there are fixtures today
  const hasTodayFixtures = useMemo(() => {
    if ((!isTeamsMode && !isGamesMode) || fixtures.length === 0) return false;
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    return fixtures.some((fixture) => {
      if (!fixture.kickoffAt) return false;
      const kickoffDate = new Date(fixture.kickoffAt);
      return kickoffDate >= startOfToday && kickoffDate <= endOfToday;
    });
  }, [fixtures, isTeamsMode, isGamesMode]);

  // Check if there are fixtures in this week (from tomorrow to end of week)
  // This tab should be shown if there are fixtures in the week that are different from today
  const hasThisWeekFixtures = useMemo(() => {
    if ((!isTeamsMode && !isGamesMode) || fixtures.length === 0) return false;
    const now = new Date();
    const startOfTomorrow = new Date(now);
    startOfTomorrow.setDate(now.getDate() + 1);
    startOfTomorrow.setHours(0, 0, 0, 0);

    // Get end of this week (Sunday)
    const endOfWeek = new Date(now);
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    const daysUntilSunday = 7 - dayOfWeek;
    endOfWeek.setDate(now.getDate() + daysUntilSunday);
    endOfWeek.setHours(23, 59, 59, 999);

    return fixtures.some((fixture) => {
      if (!fixture.kickoffAt) return false;
      const kickoffDate = new Date(fixture.kickoffAt);
      return kickoffDate >= startOfTomorrow && kickoffDate <= endOfWeek;
    });
  }, [fixtures, isTeamsMode, isGamesMode]);

  return {
    hasTodayFixtures,
    hasThisWeekFixtures,
  };
}
