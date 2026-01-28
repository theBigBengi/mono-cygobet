// hooks/useFilteredFixtures.ts
// Hook to filter fixtures based on selected filters

import { useMemo } from "react";
import type { FixtureItem } from "@/types/common";

interface UseFilteredFixturesProps {
  fixtures: FixtureItem[];
  isLeaguesMode: boolean;
  isTeamsMode: boolean;
  isGamesMode: boolean;
  selectedRound: string | null;
  selectedLeagueId: number | null;
}

/**
 * Hook to filter fixtures based on selected filters.
 * Returns filtered fixtures array.
 */
export function useFilteredFixtures({
  fixtures,
  isLeaguesMode,
  isTeamsMode,
  isGamesMode,
  selectedRound,
  selectedLeagueId,
}: UseFilteredFixturesProps): FixtureItem[] {
  return useMemo(() => {
    if (isLeaguesMode && selectedRound) {
      return fixtures.filter((fixture) => fixture.round === selectedRound);
    }
    if (isTeamsMode || isGamesMode) {
      // Special value -2 means "Today"
      if (selectedLeagueId === -2) {
        const now = new Date();
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date(now);
        endOfToday.setHours(23, 59, 59, 999);

        return fixtures.filter((fixture) => {
          if (!fixture.kickoffAt) return false;
          const kickoffDate = new Date(fixture.kickoffAt);
          return kickoffDate >= startOfToday && kickoffDate <= endOfToday;
        });
      }
      // Special value -1 means "This Week"
      if (selectedLeagueId === -1) {
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

        return fixtures.filter((fixture) => {
          if (!fixture.kickoffAt) return false;
          const kickoffDate = new Date(fixture.kickoffAt);
          return kickoffDate >= startOfTomorrow && kickoffDate <= endOfWeek;
        });
      }
      if (selectedLeagueId && selectedLeagueId > 0) {
        return fixtures.filter((fixture) => fixture.league?.id === selectedLeagueId);
      }
    }
    return fixtures;
  }, [
    fixtures,
    isLeaguesMode,
    isTeamsMode,
    isGamesMode,
    selectedRound,
    selectedLeagueId,
  ]);
}
