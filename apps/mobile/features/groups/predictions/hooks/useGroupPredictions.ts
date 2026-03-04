import { useCallback, useMemo, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useGroupQuery,
  useSaveGroupPredictionsBatchMutation,
  groupsKeys,
} from "@/domains/groups";
import type { GroupPrediction } from "@/features/group-creation/selection/games";
import type { FixtureItem } from "@/types/common";
import type { PredictionMode } from "../types";

type PendingPredictions = Record<string, GroupPrediction>;

interface UseGroupPredictionsArgs {
  groupId: number | null;
  predictionMode?: PredictionMode;
}

const EMPTY_PREDICTION: GroupPrediction = { home: null, away: null };

export function useGroupPredictions({
  groupId,
  predictionMode = "CorrectScore",
}: UseGroupPredictionsArgs) {
  const queryClient = useQueryClient();

  const { data: groupData } = useGroupQuery(groupId, { includeFixtures: true, staleTime: 5 * 60 * 1000 });
  const fixtures = useMemo<FixtureItem[]>(() => {
    const list = groupData?.data?.fixtures;
    return Array.isArray(list) ? (list as FixtureItem[]) : [];
  }, [groupData?.data?.fixtures]);

  const saveMutation = useSaveGroupPredictionsBatchMutation(groupId);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveAllPendingRef = useRef<() => Promise<void>>(() =>
    Promise.resolve()
  );

  const { data: pending = {} } = useQuery<PendingPredictions>({
    queryKey: groupsKeys.pendingPredictions(groupId ?? 0),
    queryFn: () => ({}),
    staleTime: Infinity,
    initialData: {},
    enabled: groupId != null,
  });

  // Ref-bridges: let getPrediction/isPredictionSaved read latest values
  // without recreating the callback on every keystroke.
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const fixturesRef = useRef(fixtures);
  fixturesRef.current = fixtures;

  // Cache server-side prediction objects so the same reference is returned
  // when home/away haven't changed (avoids unnecessary GC pressure).
  const serverPredictionCache = useRef<Map<string, GroupPrediction>>(new Map());

  const getPrediction = useCallback(
    (fixtureId: number): GroupPrediction => {
      const idStr = String(fixtureId);
      const currentPending = pendingRef.current;
      if (currentPending[idStr]) {
        return currentPending[idStr];
      }
      const fixture = fixturesRef.current.find((f) => f.id === fixtureId);
      if (fixture?.prediction != null) {
        const cached = serverPredictionCache.current.get(idStr);
        if (
          cached &&
          cached.home === fixture.prediction.home &&
          cached.away === fixture.prediction.away
        ) {
          return cached;
        }
        const prediction: GroupPrediction = {
          home: fixture.prediction.home,
          away: fixture.prediction.away,
        };
        serverPredictionCache.current.set(idStr, prediction);
        return prediction;
      }
      return EMPTY_PREDICTION;
    },
    []
  );

  const isPredictionSaved = useCallback(
    (fixtureId: number): boolean => {
      return !pendingRef.current[String(fixtureId)];
    },
    []
  );

  const setPendingPrediction = useCallback(
    (fixtureId: number, prediction: GroupPrediction) => {
      if (groupId == null) return;
      queryClient.setQueryData<PendingPredictions>(
        groupsKeys.pendingPredictions(groupId),
        (old) => ({
          ...(old ?? {}),
          [String(fixtureId)]: prediction,
        })
      );
    },
    [queryClient, groupId]
  );

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      saveAllPendingRef.current();
    }, 800);
  }, []);

  const updatePrediction = useCallback(
    (
      fixtureId: number,
      type: "home" | "away",
      value: string,
      onAutoNext?: (fixtureId: number, type: "home" | "away") => void
    ) => {
      let numericValue = value.replace(/[^0-9]/g, "");
      const current = getPrediction(fixtureId);
      const currentValue = current[type];

      if (numericValue.length === 2 && currentValue !== null) {
        const currentStr = String(currentValue);
        const firstChar = numericValue[0];
        const lastChar = numericValue[1];
        if (lastChar === currentStr) {
          numericValue = firstChar;
        } else if (firstChar === currentStr) {
          numericValue = lastChar;
        } else {
          numericValue = firstChar;
        }
      } else if (numericValue.length > 1) {
        numericValue = numericValue.slice(-1);
      }

      const numValue = numericValue === "" ? null : parseInt(numericValue, 10);
      if (numValue !== null && (numValue < 0 || numValue > 9)) return;

      const updated: GroupPrediction = {
        ...current,
        [type]: numValue,
      };
      setPendingPrediction(fixtureId, updated);
      scheduleSave();

      if (numValue !== null && onAutoNext) {
        setTimeout(() => onAutoNext(fixtureId, type), 50);
      }
    },
    [getPrediction, setPendingPrediction, scheduleSave]
  );

  const updateSliderValue = useCallback(
    (fixtureId: number, side: "home" | "away", val: number | null) => {
      const current = getPrediction(fixtureId);
      const otherSide = side === "home" ? "away" : "home";
      const updated: GroupPrediction = { ...current, [side]: val };

      if (val != null && current[otherSide] == null) {
        updated[otherSide] = 0;
      } else if (val == null && current[otherSide] != null) {
        updated[otherSide] = null;
      }

      setPendingPrediction(fixtureId, updated);
      scheduleSave();
    },
    [getPrediction, setPendingPrediction, scheduleSave]
  );

  const setOutcomePrediction = useCallback(
    (fixtureId: number, outcome: "home" | "draw" | "away") => {
      const mapping: Record<"home" | "draw" | "away", GroupPrediction> = {
        home: { home: 1, away: 0 },
        draw: { home: 0, away: 0 },
        away: { home: 0, away: 1 },
      };
      setPendingPrediction(fixtureId, mapping[outcome]);
      scheduleSave();
    },
    [setPendingPrediction, scheduleSave]
  );

  const getFillRandomConfirm = useCallback((): {
    needsConfirmation: boolean;
    existingCount: number;
  } | null => {
    const existingCount = fixtures.filter((f) => {
      const p = getPrediction(f.id);
      return p.home !== null && p.away !== null;
    }).length;
    if (existingCount === 0) return null;
    return { needsConfirmation: true, existingCount };
  }, [fixtures, getPrediction]);

  const fillRandomPredictions = useCallback(
    (fixtureIds: number[], confirmed?: boolean) => {
      const confirmInfo = getFillRandomConfirm();
      if (confirmInfo !== null && confirmed !== true) return;
      if (groupId == null) return;

      const outcomes: GroupPrediction[] = [
        { home: 1, away: 0 },
        { home: 0, away: 0 },
        { home: 0, away: 1 },
      ];

      const next: PendingPredictions = { ...pending };
      fixtureIds.forEach((id) => {
        if (predictionMode === "MatchWinner") {
          next[String(id)] =
            outcomes[Math.floor(Math.random() * outcomes.length)];
        } else {
          next[String(id)] = {
            home: Math.floor(Math.random() * 10),
            away: Math.floor(Math.random() * 10),
          };
        }
      });

      queryClient.setQueryData<PendingPredictions>(
        groupsKeys.pendingPredictions(groupId),
        () => next
      );
      scheduleSave();
    },
    [
      groupId,
      predictionMode,
      pending,
      getFillRandomConfirm,
      queryClient,
      scheduleSave,
    ]
  );

  const saveAllPending = useCallback(async () => {
    if (groupId == null) return;

    const currentPending = queryClient.getQueryData<PendingPredictions>(
      groupsKeys.pendingPredictions(groupId)
    );
    if (!currentPending || Object.keys(currentPending).length === 0) return;

    const toSave = Object.entries(currentPending)
      .filter(([_, pred]) => pred.home !== null && pred.away !== null)
      .map(([id, pred]) => ({
        fixtureId: parseInt(id, 10),
        home: pred.home!,
        away: pred.away!,
      }));

    if (toSave.length === 0) return;

    try {
      const result = await saveMutation.mutateAsync({ predictions: toSave });
      const savedIds = new Set(result.saved?.map((s) => s.fixtureId) ?? []);
      const rejectedIds = new Set(result.rejected?.map((r) => r.fixtureId) ?? []);
      const handledIds = new Set([...savedIds, ...rejectedIds]);

      queryClient.setQueryData(
        groupsKeys.detail(groupId, true),
        (old: unknown) => {
          const prev = old as {
            data?: { fixtures?: FixtureItem[] };
            status?: string;
            message?: string;
          };
          if (!prev?.data?.fixtures) return old;
          const now = new Date().toISOString();
          return {
            ...prev,
            data: {
              ...prev.data,
              fixtures: prev.data!.fixtures!.map((f: FixtureItem) => {
                const savedPred = currentPending[String(f.id)];
                if (savedIds.has(f.id) && savedPred) {
                  const existing =
                    (f as { prediction?: Record<string, unknown> })
                      .prediction ?? {};
                  return {
                    ...f,
                    prediction: {
                      ...existing,
                      home: savedPred.home,
                      away: savedPred.away,
                      updatedAt: now,
                    },
                  };
                }
                return f;
              }),
            },
          };
        }
      );

      queryClient.setQueryData<PendingPredictions>(
        groupsKeys.pendingPredictions(groupId),
        (old) => {
          if (!old) return {};
          const next: PendingPredictions = {};
          Object.entries(old).forEach(([id, pred]) => {
            const fixtureId = parseInt(id, 10);
            const savedPred = currentPending[id];
            // Clear if saved/rejected AND pending value hasn't changed while save was in flight
            const shouldClear =
              handledIds.has(fixtureId) &&
              savedPred &&
              pred.home === savedPred.home &&
              pred.away === savedPred.away;
            if (!shouldClear) {
              next[id] = pred;
            }
          });
          return next;
        }
      );
    } catch (err) {
      if (__DEV__) {
        console.error("Failed to save predictions:", err);
      }
      // Re-throw so callers can handle (e.g. show error UI)
      throw err;
    }
  }, [groupId, queryClient, saveMutation]);

  saveAllPendingRef.current = saveAllPending;

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        saveAllPendingRef.current();
      }
    };
  }, []);

  const pendingCount = Object.keys(pending).length;
  const hasPendingChanges = pendingCount > 0;

  return {
    getPrediction,
    isPredictionSaved,
    updatePrediction,
    updateSliderValue,
    setOutcomePrediction,
    getFillRandomConfirm,
    fillRandomPredictions,
    saveAllPending,
    isSaving: saveMutation.isPending,
    hasPendingChanges,
    pendingCount,
    /** Raw pending map — used as extraData trigger in FlatList consumers. */
    pending,
  };
}
