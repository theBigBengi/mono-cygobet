// useFilteredFixtures.ts — Apply action + structural filters, sort, and compute empty state.

import { useMemo } from "react";
import { isLive, isFinished, isNotStarted } from "@repo/utils";
import type { FixtureItem } from "@/types/common";
import {
  classifyFixtureTime,
  isToPredict,
  getTimeBuckets,
} from "./useActionChips";
import type { StructuralFilter } from "./useStructuralFilter";
import type { ActionChip } from "./useActionChips";

export type EmptyStateInfo = {
  message: string;
  suggestion?: { label: string; action: () => void };
};

interface UseFilteredFixturesParams {
  fixtures: FixtureItem[];
  selectedAction: string;
  structuralFilter: StructuralFilter | null;
  actionChips: ActionChip[];
  selectAction: (id: string) => void;
  onNavigateToLeaderboard?: () => void;
}

export function useFilteredFixtures({
  fixtures,
  selectedAction,
  structuralFilter,
  actionChips,
  selectAction,
  onNavigateToLeaderboard,
}: UseFilteredFixturesParams) {
  const buckets = useMemo(() => getTimeBuckets(), []);

  return useMemo(() => {
    const total = fixtures.length;
    if (total === 0) {
      return {
        filteredFixtures: [] as FixtureItem[],
        emptyState: null as EmptyStateInfo | null,
        hasAnyChips: false,
      };
    }

    const nextFixture = (() => {
      const ns = fixtures.filter((f) => isNotStarted(f.state));
      if (ns.length === 0) return null;
      return (
        ns.sort(
          (a, b) =>
            new Date(a.kickoffAt ?? 0).getTime() -
            new Date(b.kickoffAt ?? 0).getTime()
        )[0] ?? null
      );
    })();

    const resultsCount = fixtures.filter((f) => isFinished(f.state)).length;
    const toPredictCount = fixtures.filter(isToPredict).length;

    function applyActionFilter(
      list: FixtureItem[],
      actionId: string
    ): FixtureItem[] {
      if (actionId === "all") return list;
      if (actionId === "live") return list.filter((f) => isLive(f.state));
      if (actionId === "predict") return list.filter(isToPredict);
      if (actionId === "results")
        return list.filter((f) => isFinished(f.state));
      if (actionId === "time:today") {
        return list.filter(
          (f) => classifyFixtureTime(f.kickoffAt, buckets) === "today"
        );
      }
      if (actionId === "time:tomorrow") {
        return list.filter(
          (f) => classifyFixtureTime(f.kickoffAt, buckets) === "tomorrow"
        );
      }
      if (actionId === "time:this-week") {
        return list.filter(
          (f) => classifyFixtureTime(f.kickoffAt, buckets) === "this-week"
        );
      }
      if (actionId === "time:next" && nextFixture?.kickoffAt) {
        const t = new Date(nextFixture.kickoffAt).getTime();
        return list.filter((f) => {
          const k = f.kickoffAt ? new Date(f.kickoffAt).getTime() : 0;
          return k >= t && isNotStarted(f.state);
        });
      }
      return list;
    }

    let afterAction = applyActionFilter(fixtures, selectedAction);

    if (structuralFilter) {
      if (
        structuralFilter.type === "teams" &&
        structuralFilter.selectedTeamId != null
      ) {
        const tid = structuralFilter.selectedTeamId;
        afterAction = afterAction.filter(
          (f) => f.homeTeam?.id === tid || f.awayTeam?.id === tid
        );
      } else if (structuralFilter.type === "rounds") {
        const r = structuralFilter.selectedRound;
        afterAction = afterAction.filter((f) => f.round === r);
      }
    }

    const filteredFixtures = [...afterAction].sort(
      (a, b) =>
        new Date(a.kickoffAt ?? 0).getTime() -
        new Date(b.kickoffAt ?? 0).getTime()
    );

    const hasAnyChips = actionChips.length > 0;

    let emptyState: EmptyStateInfo | null = null;
    if (filteredFixtures.length === 0 && total > 0) {
      const allFinished = resultsCount === total;
      if (allFinished) {
        emptyState = {
          message: "All games completed!",
          suggestion: {
            label: "Check the leaderboard →",
            action: () => onNavigateToLeaderboard?.(),
          },
        };
      } else {
        emptyState = {
          message:
            selectedAction === "live"
              ? "No live games right now."
              : selectedAction === "predict"
                ? "No games to predict in this filter."
                : "No fixtures match this filter.",
          suggestion:
            toPredictCount > 0
              ? {
                  label: `${toPredictCount} games to predict →`,
                  action: () => selectAction("predict"),
                }
              : { label: "Show all →", action: () => selectAction("all") },
        };
      }
    }

    return {
      filteredFixtures,
      emptyState,
      hasAnyChips,
    };
  }, [
    fixtures,
    selectedAction,
    structuralFilter,
    buckets,
    actionChips.length,
    selectAction,
    onNavigateToLeaderboard,
  ]);
}
