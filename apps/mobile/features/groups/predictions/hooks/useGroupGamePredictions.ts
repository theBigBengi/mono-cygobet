import React from "react";
import { useSaveGroupPredictionsBatchMutation } from "@/domains/groups";
import type { GroupPrediction } from "@/features/group-creation/selection/games";
import type { FixtureItem } from "@/types/common";
import type { PredictionMode } from "../types";

type UseGroupGamePredictionsArgs = {
  groupId: number | null;
  fixtures: FixtureItem[];
  predictionMode?: PredictionMode;
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
  predictionMode,
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

  const savePredictionsBatchMutation =
    useSaveGroupPredictionsBatchMutation(groupId);

  const saveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  /**
   * Ref to call save from debounced callback (saveAllChangedPredictions is defined later).
   */
  const saveAllChangedPredictionsRef = React.useRef<
    () => Promise<{ rejected?: number }>
  >(() => Promise.resolve({}));

  /**
   * Debounced save: after 800ms of no input/slider activity, save all changed predictions.
   */
  const debouncedSave = React.useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      saveAllChangedPredictionsRef.current();
    }, 800);
  }, []);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, []);

  // Refs to access current state in useEffect without adding to deps
  const predictionsRef = React.useRef<PredictionsByFixtureId>({});
  const savedSnapshotsRef = React.useRef<PredictionsByFixtureId>({});
  predictionsRef.current = predictions;
  savedSnapshotsRef.current = savedPredictionSnapshots;

  // Sync local predictions & snapshots whenever fixtures from the server change
  // BUT preserve local unsaved changes
  React.useEffect(() => {
    if (!fixtures || fixtures.length === 0) {
      setPredictions({});
      setSavedPredictions(new Set());
      setSavedPredictionSnapshots({});
      return;
    }

    const currentPredictions = predictionsRef.current;
    const currentSnapshots = savedSnapshotsRef.current;

    const nextPredictions: PredictionsByFixtureId = {};
    const nextSaved = new Set<number>();
    const nextSnapshots: PredictionsByFixtureId = {};

    fixtures.forEach((fixture) => {
      const fixtureIdStr = String(fixture.id);
      const localPrediction = currentPredictions[fixtureIdStr];
      const lastSaved = currentSnapshots[fixtureIdStr];

      // Check if there's an unsaved local change
      const hasUnsavedChange =
        localPrediction != null &&
        (localPrediction.home !== lastSaved?.home ||
          localPrediction.away !== lastSaved?.away);

      if (hasUnsavedChange) {
        // Keep local unsaved value - don't overwrite with server data
        nextPredictions[fixtureIdStr] = localPrediction;
        // Keep existing snapshot (or none if new)
        if (lastSaved) {
          nextSnapshots[fixtureIdStr] = lastSaved;
          nextSaved.add(fixture.id);
        }
      } else if (fixture.prediction) {
        // No local changes - use server value
        const snapshot: GroupPrediction = {
          home: fixture.prediction.home,
          away: fixture.prediction.away,
        };
        nextPredictions[fixtureIdStr] = snapshot;
        nextSnapshots[fixtureIdStr] = snapshot;
        nextSaved.add(fixture.id);
      } else {
        // No prediction on server and no local changes
        nextPredictions[fixtureIdStr] = { home: null, away: null };
      }
    });

    setPredictions(nextPredictions);
    setSavedPredictions(nextSaved);
    setSavedPredictionSnapshots(nextSnapshots);
  }, [fixtures]);

  const setOutcomePrediction = React.useCallback(
    (fixtureId: number, outcome: "home" | "draw" | "away") => {
      const mapping: Record<"home" | "draw" | "away", GroupPrediction> = {
        home: { home: 1, away: 0 },
        draw: { home: 0, away: 0 },
        away: { home: 0, away: 1 },
      };
      const value = mapping[outcome];
      setPredictions((prev) => ({
        ...prev,
        [String(fixtureId)]: value,
      }));
    },
    []
  );

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
      const currentPrediction = predictionsRef.current[fixtureIdStr];
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

      const numValue = numericValue === "" ? null : parseInt(numericValue, 10);
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

      // Trigger debounced save
      debouncedSave();

      // Auto-advance only after a valid digit input.
      // We delay a bit so RN finishes updating selection/value before focusing the next input.
      if (numValue !== null && onAutoNext) {
        setTimeout(() => onAutoNext(fixtureId, type), 50);
      }
    },
    [debouncedSave]
  );

  /**
   * Update slider value with auto-pair logic.
   * Uses functional state update so it always sees the latest state.
   */
  const updateSliderValue = React.useCallback(
    (fixtureId: number, side: "home" | "away", val: number | null) => {
      setPredictions((prev) => {
        const fixtureIdStr = String(fixtureId);
        const current = prev[fixtureIdStr] || { home: null, away: null };
        const otherSide = side === "home" ? "away" : "home";
        const otherValue = current[otherSide];

        const newPrediction = { ...current };
        newPrediction[side] = val;

        if (val != null && otherValue == null) {
          newPrediction[otherSide] = 0;
        } else if (val == null && otherValue != null) {
          newPrediction[otherSide] = null;
        }

        return {
          ...prev,
          [fixtureIdStr]: newPrediction,
        };
      });
      debouncedSave();
    },
    [debouncedSave]
  );

  /**
   * Returns info needed for the UI to show a confirmation before fill-random, or null if no confirmation needed.
   */
  const getFillRandomConfirm = React.useCallback((): {
    needsConfirmation: boolean;
    existingCount: number;
  } | null => {
    const existingCount = Object.values(predictions).filter(
      (p) => p.home !== null && p.away !== null
    ).length;
    if (existingCount === 0) return null;
    return { needsConfirmation: true, existingCount };
  }, [predictions]);

  const fillRandomPredictions = React.useCallback(
    (confirmed?: boolean) => {
      const confirmInfo = getFillRandomConfirm();
      if (confirmInfo !== null && confirmed !== true) return;

      const randomPredictions: PredictionsByFixtureId = {};
      const outcomes: GroupPrediction[] = [
        { home: 1, away: 0 },
        { home: 0, away: 0 },
        { home: 0, away: 1 },
      ];
      fixtures.forEach((fixture) => {
        const fixtureIdStr = String(fixture.id);
        if (predictionMode === "MatchWinner") {
          randomPredictions[fixtureIdStr] =
            outcomes[Math.floor(Math.random() * 3)];
        } else {
          randomPredictions[fixtureIdStr] = {
            home: Math.floor(Math.random() * 10),
            away: Math.floor(Math.random() * 10),
          };
        }
      });
      setPredictions(randomPredictions);
    },
    [fixtures, predictionMode, getFillRandomConfirm]
  );

  const clearAllPredictions = React.useCallback(() => {
    setPredictions({});
    setSavedPredictions(new Set());
    setSavedPredictionSnapshots({});
  }, []);

  /**
   * Returns all predictions that have been changed but not yet saved.
   * Only includes predictions where both home and away are filled.
   */
  const getChangedPredictions = React.useCallback((): {
    fixtureId: number;
    home: number;
    away: number;
  }[] => {
    const changed: {
      fixtureId: number;
      home: number;
      away: number;
    }[] = [];

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
        if (prediction.home !== null && prediction.away !== null) {
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
   * Returns a Promise that resolves with { rejected?: number } when some predictions were rejected (match started),
   * or rejects with the error when the request fails. Caller should show alerts based on result.
   */
  const saveAllChangedPredictions = React.useCallback((): Promise<{
    rejected?: number;
  }> => {
    return new Promise((resolve, reject) => {
      if (savePredictionsBatchMutation.isPending) {
        resolve({});
        return;
      }

      const changed = getChangedPredictions();

      if (changed.length === 0 || !groupId) {
        resolve({});
        return;
      }

      savePredictionsBatchMutation.mutate(
        {
          predictions: changed,
        },
        {
          onSuccess: (data) => {
            const savedFixtureIds = new Set(
              (data.saved ?? []).map((s) => s.fixtureId)
            );
            changed
              .filter((c) => savedFixtureIds.has(c.fixtureId))
              .forEach(({ fixtureId, home, away }) => {
                setSavedPredictions((prev) => new Set(prev).add(fixtureId));
                const fixtureIdStr = String(fixtureId);
                setSavedPredictionSnapshots((prev) => ({
                  ...prev,
                  [fixtureIdStr]: { home, away },
                }));
              });
            const rejectedCount = data.rejected?.length ?? 0;
            resolve(rejectedCount > 0 ? { rejected: rejectedCount } : {});
          },
          onError: (error: unknown) => {
            console.error("Failed to save predictions:", error);
            reject(error);
          },
        }
      );
    });
  }, [getChangedPredictions, groupId, savePredictionsBatchMutation]);

  // Update ref so debounced callback can call the latest version
  saveAllChangedPredictionsRef.current = saveAllChangedPredictions;

  return {
    predictions,
    savedPredictions,
    updatePrediction,
    updateSliderValue,
    setOutcomePrediction,
    getFillRandomConfirm,
    fillRandomPredictions,
    clearAllPredictions,
    getChangedPredictions,
    saveAllChangedPredictions,
    isSaving: savePredictionsBatchMutation.isPending,
  };
}
