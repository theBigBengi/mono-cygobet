// hooks/useSmartFilters.ts
// Thin orchestrator: composes useActionChips, useStructuralFilter, useFilteredFixtures.
// Preserves auto-selection and recovery effects. Same public API as before.

import { useEffect } from "react";
import { isLive, isFinished } from "@repo/utils";
import type { FixtureItem } from "@/types/common";
import { classifyFixtureTime, isToPredict } from "./useActionChips";
import { useActionChips } from "./useActionChips";
import { useStructuralFilter } from "./useStructuralFilter";
import { useFilteredFixtures } from "./useFilteredFixtures";

export type { ActionChip } from "./useActionChips";
export type { EmptyStateInfo } from "./useFilteredFixtures";
export type {
  TeamChip,
  RoundInfo,
  RoundStatus,
  StructuralFilter,
} from "./useStructuralFilter";

type SelectionMode = "games" | "teams" | "leagues";

interface UseSmartFiltersProps {
  fixtures: FixtureItem[];
  mode: SelectionMode;
  groupTeamsIds?: number[];
  onNavigateToLeaderboard?: () => void;
}

export function useSmartFilters({
  fixtures,
  mode,
  groupTeamsIds,
  onNavigateToLeaderboard,
}: UseSmartFiltersProps) {
  const {
    actionChips,
    selectedAction,
    selectAction,
    setSelectedAction,
    buckets,
    hasAutoSelectedRef,
    userHasChangedSelection,
  } = useActionChips(fixtures);

  const {
    structuralFilter,
    selectTeam,
    selectRound,
    navigateRound,
    setSelectedRound,
    setSelectedTeamId,
  } = useStructuralFilter({ fixtures, mode, groupTeamsIds });

  const { filteredFixtures, emptyState, hasAnyChips } = useFilteredFixtures({
    fixtures,
    selectedAction,
    structuralFilter,
    actionChips,
    selectAction,
    onNavigateToLeaderboard,
  });

  useEffect(() => {
    if (
      fixtures.length === 0 ||
      userHasChangedSelection.current ||
      hasAutoSelectedRef.current
    )
      return;
    hasAutoSelectedRef.current = true;
    const liveCount = fixtures.filter((f) => isLive(f.state)).length;
    const toPredictCount = fixtures.filter(isToPredict).length;
    const toPredictTodayCount = fixtures.filter(
      (f) =>
        isToPredict(f) && classifyFixtureTime(f.kickoffAt, buckets) === "today"
    ).length;
    const todayCount = fixtures.filter(
      (f) => classifyFixtureTime(f.kickoffAt, buckets) === "today"
    ).length;
    const total = fixtures.length;

    if (liveCount > 0) {
      setSelectedAction("live");
      return;
    }
    if (toPredictCount > 0 && toPredictTodayCount > 0) {
      setSelectedAction("predict");
      if (mode === "leagues") {
        const roundWithToday = fixtures
          .filter((f) => classifyFixtureTime(f.kickoffAt, buckets) === "today")
          .map((f) => f.round)
          .filter(Boolean)[0];
        if (roundWithToday) setSelectedRound(roundWithToday);
      }
      return;
    }
    if (toPredictCount > 0 && toPredictCount < total) {
      setSelectedAction("predict");
      return;
    }
    if (todayCount > 0 && todayCount < total) {
      setSelectedAction("time:today");
      return;
    }
    setSelectedAction("all");
  }, [fixtures, mode, buckets, setSelectedAction, setSelectedRound]);

  useEffect(() => {
    if (filteredFixtures.length > 0 || fixtures.length === 0) return;
    if (selectedAction === "all") {
      setSelectedRound(null);
      setSelectedTeamId(null);
      return;
    }
    const liveCount = fixtures.filter((f) => isLive(f.state)).length;
    const toPredictCount = fixtures.filter(isToPredict).length;
    const resultsCount = fixtures.filter((f) => isFinished(f.state)).length;
    const todayCount = fixtures.filter(
      (f) => classifyFixtureTime(f.kickoffAt, buckets) === "today"
    ).length;
    const todayChipId = actionChips.find((c) => c.id === "time:today")?.id;

    if (liveCount > 0) {
      setSelectedAction("live");
    } else if (resultsCount > 0) {
      setSelectedAction("results");
    } else if (toPredictCount > 0 && toPredictCount < fixtures.length) {
      setSelectedAction("predict");
    } else if (todayCount > 0 && todayCount < fixtures.length && todayChipId) {
      setSelectedAction(todayChipId);
    } else {
      setSelectedRound(null);
      setSelectedTeamId(null);
      setSelectedAction("all");
    }
  }, [
    filteredFixtures.length,
    fixtures.length,
    fixtures,
    actionChips,
    buckets,
    selectedAction,
    setSelectedAction,
    setSelectedRound,
    setSelectedTeamId,
  ]);

  return {
    actionChips,
    selectedAction,
    selectAction,
    structuralFilter,
    selectTeam,
    selectRound,
    navigateRound,
    filteredFixtures,
    hasAnyChips,
    emptyState,
  };
}
