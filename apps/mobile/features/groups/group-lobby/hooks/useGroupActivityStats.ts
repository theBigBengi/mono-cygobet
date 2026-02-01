// useGroupActivityStats.ts
// Client-side stats derived from group fixtures (for lobby when getGroupById doesn't return counts).
// Uses UTC for "today" to match server (getTodayUtcBounds).

import { useMemo } from "react";
import { isLive, isNotStarted } from "@repo/utils";
import type { FixtureItem } from "@/types/common";

function getTodayUtcBoundsMs(): { startMs: number; endMs: number } {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  const startMs = Date.UTC(y, m, day, 0, 0, 0, 0);
  const endMs = Date.UTC(y, m, day, 23, 59, 59, 999) + 1;
  return { startMs, endMs };
}

function isTodayUtc(kickoffAt: string): boolean {
  const kickoffMs = new Date(kickoffAt).getTime();
  const { startMs, endMs } = getTodayUtcBoundsMs();
  return kickoffMs >= startMs && kickoffMs < endMs;
}

/**
 * Derives activity stats from a list of fixtures (e.g. group.fixtures from getGroupById).
 * Uses UTC for "today" to match list card (server) counts.
 */
export function useGroupActivityStats(fixtures: FixtureItem[]) {
  return useMemo(() => {
    const now = Date.now();

    const liveGames = fixtures.filter((f) => isLive(f.state));
    const todayGames = fixtures.filter((f) => isTodayUtc(f.kickoffAt));
    const unpredicted = fixtures.filter(
      (f) => isNotStarted(f.state) && !f.prediction
    );
    const todayUnpredicted = todayGames.filter(
      (f) => isNotStarted(f.state) && !f.prediction
    );
    const nextGame = fixtures.find(
      (f) =>
        isNotStarted(f.state) && new Date(f.kickoffAt).getTime() > now
    ) ?? null;

    return {
      liveGamesCount: liveGames.length,
      todayGamesCount: todayGames.length,
      todayUnpredictedCount: todayUnpredicted.length,
      unpredictedGamesCount: unpredicted.length,
      nextGame,
    };
  }, [fixtures]);
}
