import { useMemo } from "react";
import type { FixtureItem } from "@/types/common";

interface UsePredictionsStatsParams {
  fixtures: FixtureItem[];
}

interface UsePredictionsStatsResult {
  latestUpdatedAt: Date | null;
  savedPredictionsCount: number;
  totalPredictionsCount: number;
}

/**
 * Hook to calculate statistics about predictions from fixtures (server/cache).
 * - Latest updated timestamp from fixture.prediction?.updatedAt
 * - Count of fixtures that have a saved prediction (fixture.prediction with home/away)
 * - Total count of fixtures
 */
export function usePredictionsStats({
  fixtures,
}: UsePredictionsStatsParams): UsePredictionsStatsResult {
  const latestUpdatedAt = useMemo<Date | null>(() => {
    if (fixtures.length === 0) return null;
    let latest: Date | null = null;
    fixtures.forEach((fixture) => {
      if (fixture.prediction?.updatedAt) {
        const updatedDate = new Date(fixture.prediction.updatedAt);
        if (!latest || updatedDate > latest) {
          latest = updatedDate;
        }
      }
    });
    return latest;
  }, [fixtures]);

  const savedPredictionsCount = useMemo(() => {
    return fixtures.filter(
      (fixture) =>
        fixture.prediction != null &&
        fixture.prediction.home != null &&
        fixture.prediction.away != null
    ).length;
  }, [fixtures]);

  const totalPredictionsCount = fixtures.length;

  return {
    latestUpdatedAt,
    savedPredictionsCount,
    totalPredictionsCount,
  };
}
