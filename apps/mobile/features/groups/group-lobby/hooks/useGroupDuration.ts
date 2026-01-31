// useGroupDuration.ts
// Client-side duration derived from group fixtures (for lobby when fixtures are loaded).

import { useMemo } from "react";
import type { FixtureItem } from "@/types/common";

const SECONDS_PER_DAY = 86400;

export type GroupDurationResult = {
  firstGame: FixtureItem;
  lastGame: FixtureItem;
  durationDays: number;
  startDate: string;
  endDate: string;
};

/**
 * Derives group duration from a list of fixtures (e.g. group.fixtures from getGroupById).
 * Returns null when there are no fixtures.
 */
export function useGroupDuration(
  fixtures: FixtureItem[]
): GroupDurationResult | null {
  return useMemo(() => {
    if (fixtures.length === 0) return null;

    const sorted = [...fixtures].sort((a, b) => a.startTs - b.startTs);
    const firstGame = sorted[0];
    const lastGame = sorted[sorted.length - 1];
    const durationDays = Math.ceil(
      (lastGame.startTs - firstGame.startTs) / SECONDS_PER_DAY
    );

    return {
      firstGame,
      lastGame,
      durationDays,
      startDate: firstGame.kickoffAt,
      endDate: lastGame.kickoffAt,
    };
  }, [fixtures]);
}
