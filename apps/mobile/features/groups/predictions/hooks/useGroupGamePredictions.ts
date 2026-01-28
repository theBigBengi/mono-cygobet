import React from "react";
import { useSaveGroupPredictionsBatchMutation } from "@/domains/groups";
import type { GroupPrediction } from "@/features/group-creation/selection/games";
import type { FixtureItem } from "@/types/common";

type UseGroupGamePredictionsArgs = {
  groupId: number | null;
  fixtures: FixtureItem[];
};

type PredictionsByFixtureId = Record<string, GroupPrediction>;

/**
 * Encapsulates all prediction state and save logic for group games.
 *
 * Responsibilities:
 * - initialize predictions from fixtures coming from the server
 * - track which fixtures are \"saved\"
 * - keep a snapshot of the last-saved prediction to avoid redundant saves
 * - expose helpers to update / random-fill / clear predictions
 * - expose getChangedPredictions and saveAllChangedPredictions for batch saving
 */
export function useGroupGamePredictions({
  groupId,
  fixtures,
}: UseGroupGamePredictionsArgs) {
  const [predictions, setPredictions] = React.useState<PredictionsByFixtureId>(
    {}
  );

  const [savedPredictions, setSavedPredictions] = React.useState<Set<number>>(
    new Set()
  );

  // Snapshot of last-saved values used to detect real changes
  const [savedPredictionSnapshots, setSavedPredictionSnapshots] =
    React.useState<PredictionsByFixtureId>({});

  const savePredictionsBatchMutation = useSaveGroupPredictionsBatchMutation(groupId);

  // Sync local predictions & snapshots whenever fixtures from the server change
  React.useEffect(() => {
    if (!fixtures || fixtures.length === 0) {
      setPredictions({});
      setSavedPredictions(new Set());
      setSavedPredictionSnapshots({});
      return;
    }

    const nextPredictions: PredictionsByFixtureId = {};
    const nextSaved = new Set<number>();
    const nextSnapshots: PredictionsByFixtureId = {};

    fixtures.forEach((fixture) => {
      const fixtureIdStr = String(fixture.id);
      if (fixture.prediction) {
        const snapshot: GroupPrediction = {
          home: fixture.prediction.home,
          away: fixture.prediction.away,
        };
        nextPredictions[fixtureIdStr] = snapshot;
        nextSnapshots[fixtureIdStr] = snapshot;
        nextSaved.add(fixture.id);
      } else {
        nextPredictions[fixtureIdStr] = { home: null, away: null };
      }
    });

    setPredictions(nextPredictions);
    setSavedPredictions(nextSaved);
    setSavedPredictionSnapshots(nextSnapshots);
  }, [fixtures]);

  const updatePrediction = React.useCallback(
    (
      fixtureId: number,
      type: "home" | "away",
      value: string,
      onAutoNext?: (fixtureId: number, type: "home" | "away") => void
    ) => {
      // Single digit validation: only 0-9
      let numericValue = value.replace(/[^0-9]/g, "");

      // Get current prediction value to detect if user is replacing existing digit
      const fixtureIdStr = String(fixtureId);
      const currentPrediction = predictions[fixtureIdStr];
      const currentValue = currentPrediction?.[type];

      // If we have 2 digits, it means user typed a new digit when there was
      // already an existing digit. We need to determine which digit to keep.
      // - If user clicked on the left side and typed, the new digit is FIRST (e.g., "5" -> "35", keep "3")
      // - If user typed quickly at the end, the new digit is LAST (e.g., "3" -> "35", keep "5")
      // Strategy: take the digit that's different from the current value
      if (numericValue.length === 2 && currentValue !== null) {
        const currentStr = String(currentValue);
        const firstChar = numericValue[0];
        const lastChar = numericValue[1];
        
        // If the last char matches current, user typed at the end - take last (new)
        // If the first char matches current, user clicked left and typed - take first (new)
        // Otherwise, take the one that's different from current (the new digit)
        if (lastChar === currentStr) {
          // Current value is at the end, so new digit is first: "5" -> "35" (user clicked left), keep "3"
          numericValue = firstChar;
        } else if (firstChar === currentStr) {
          // Current value is at the start, so new digit is last: "3" -> "35" (user typed quickly), keep "5"
          numericValue = lastChar;
        } else {
          // Neither matches current - take the first (most likely user clicked left and typed)
          numericValue = firstChar;
        }
      } else if (numericValue.length > 1) {
        // More than 2 digits or no current value - just take the last digit (most recent)
        numericValue = numericValue.slice(-1);
      }

      const numValue =
        numericValue === "" ? null : parseInt(numericValue, 10);
      if (numValue !== null && (numValue < 0 || numValue > 9)) return;

      setPredictions((prev) => {
        const fixtureIdStr = String(fixtureId);
        const current = prev[fixtureIdStr] || { home: null, away: null };
        return {
          ...prev,
          [fixtureIdStr]: {
            ...current,
            [type]: numValue,
          },
        };
      });

      // Auto-advance only after a valid digit input.
      // We delay a bit so RN finishes updating selection/value before focusing the next input.
      if (numValue !== null && onAutoNext) {
        setTimeout(() => onAutoNext(fixtureId, type), 50);
      }
    },
    [predictions]
  );

  const fillRandomPredictions = React.useCallback(() => {
    const randomPredictions: PredictionsByFixtureId = {};
    fixtures.forEach((fixture) => {
      const fixtureIdStr = String(fixture.id);
      randomPredictions[fixtureIdStr] = {
        home: Math.floor(Math.random() * 10), // 0-9
        away: Math.floor(Math.random() * 10), // 0-9
      };
    });
    setPredictions(randomPredictions);
  }, [fixtures]);

  const clearAllPredictions = React.useCallback(() => {
    setPredictions({});
    setSavedPredictions(new Set());
    setSavedPredictionSnapshots({});
  }, []);

  /**
   * Returns all predictions that have been changed but not yet saved.
   * Only includes predictions where both home and away are filled.
   */
  const getChangedPredictions = React.useCallback((): Array<{
    fixtureId: number;
    home: number;
    away: number;
  }> => {
    const changed: Array<{
      fixtureId: number;
      home: number;
      away: number;
    }> = [];

    Object.keys(predictions).forEach((fixtureIdStr) => {
      const fixtureId = parseInt(fixtureIdStr, 10);
      const prediction = predictions[fixtureIdStr];
      const lastSaved = savedPredictionSnapshots[fixtureIdStr];

      // Check if prediction has changed compared to last saved
      const isUnchanged =
        !!lastSaved &&
        !!prediction &&
        lastSaved.home === prediction.home &&
        lastSaved.away === prediction.away;

      if (!isUnchanged && prediction) {
        // Only include if both home and away are filled
        if (
          prediction.home !== null &&
          prediction.away !== null
        ) {
          changed.push({
            fixtureId,
            home: prediction.home,
            away: prediction.away,
          });
        }
      }
    });

    return changed;
  }, [predictions, savedPredictionSnapshots]);

  /**
   * Saves all changed predictions in a single batch request.
   */
  const saveAllChangedPredictions = React.useCallback(async () => {
    // Prevent double saves if already saving
    if (savePredictionsBatchMutation.isPending) {
      return;
    }

    const changed = getChangedPredictions();

    if (changed.length === 0 || !groupId) {
      return;
    }

    savePredictionsBatchMutation.mutate(
      {
        predictions: changed,
      },
      {
        onSuccess: () => {
          // Mark all changed predictions as saved
          changed.forEach(({ fixtureId, home, away }) => {
            setSavedPredictions((prev) => new Set(prev).add(fixtureId));
            const fixtureIdStr = String(fixtureId);
            setSavedPredictionSnapshots((prev) => ({
              ...prev,
              [fixtureIdStr]: {
                home,
                away,
              },
            }));
          });
        },
        onError: (error: unknown) => {
          // Don't mark as saved on error
          console.error("Failed to save predictions:", error);
        },
      }
    );
  }, [getChangedPredictions, groupId, savePredictionsBatchMutation]);

  return {
    predictions,
    savedPredictions,
    updatePrediction,
    fillRandomPredictions,
    clearAllPredictions,
    getChangedPredictions,
    saveAllChangedPredictions,
    isSaving: savePredictionsBatchMutation.isPending,
  };
}

