import { useMemo } from "react";
import type { FixtureItem } from "@/types/common";
import type { GroupPrediction } from "@/features/group-creation/selection/games";

type PredictionsByFixtureId = Record<string, GroupPrediction>;

interface UsePredictionsStatsParams {
  fixtures: FixtureItem[];
  predictions: PredictionsByFixtureId;
  savedPredictions: Set<number>;
}

interface UsePredictionsStatsResult {
  latestUpdatedAt: Date | null;
  savedPredictionsCount: number;
  totalPredictionsCount: number;
}

/**
 * Hook to calculate statistics about predictions:
 * - Latest updated timestamp
 * - Count of saved predictions (with both home and away filled)
 * - Total count of fixtures
 */
export function usePredictionsStats({
  fixtures,
  predictions,
  savedPredictions,
}: UsePredictionsStatsParams): UsePredictionsStatsResult {
  // Calculate the latest updatedAt from all predictions
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

  // Calculate saved predictions count (predictions with both home and away filled and saved)
  const savedPredictionsCount = useMemo(() => {
    return fixtures.filter((fixture) => {
      const fixtureIdStr = String(fixture.id);
      const prediction = predictions[fixtureIdStr];
      return (
        prediction &&
        prediction.home !== null &&
        prediction.away !== null &&
        savedPredictions.has(fixture.id)
      );
    }).length;
  }, [fixtures, predictions, savedPredictions]);

  const totalPredictionsCount = fixtures.length;

  return {
    latestUpdatedAt,
    savedPredictionsCount,
    totalPredictionsCount,
  };
}
