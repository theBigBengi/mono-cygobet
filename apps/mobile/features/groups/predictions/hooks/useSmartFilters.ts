// hooks/useSmartFilters.ts
// Thin orchestrator: composes useActionChips, useStructuralFilter, useFilteredFixtures.
// Preserves auto-selection and recovery effects. Same public API as before.

import { useEffect, useCallback, useRef } from "react";
import type { FixtureItem } from "@/types/common";
import { useActionChips } from "./useActionChips";
import { useStructuralFilter } from "./useStructuralFilter";
import { useFilteredFixtures } from "./useFilteredFixtures";

export type { ActionChip } from "./useActionChips";
export type { EmptyStateInfo } from "./useFilteredFixtures";
export type {
  TeamChip,
  CompetitionChip,
  RoundInfo,
  RoundStatus,
  WeekInfo,
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
    userHasChangedSelection,
  } = useActionChips({ fixtures, mode });

  const hasAutoSelected = useRef(false);

  const {
    structuralFilter,
    selectTeam,
    selectCompetition,
    selectRound,
    navigateRound,
    selectWeek,
    navigateWeek,
    setSelectedRound,
    setSelectedTeamId,
    setSelectedWeek,
  } = useStructuralFilter({ fixtures, mode, groupTeamsIds });

  // Track if round filter is active (selectedAction is "round")
  const isRoundFilterActive = mode === "leagues" && selectedAction === "round";

  // Wrapped selectAction
  const handleSelectAction = useCallback(
    (actionId: string) => {
      selectAction(actionId);
    },
    [selectAction]
  );

  // Handle selecting a round - activates round filter mode
  const handleSelectRound = useCallback(
    (round: string) => {
      selectRound(round);
      // Set action to "round" to indicate round filtering is active
      if (mode === "leagues") {
        selectAction("round");
      }
    },
    [selectRound, selectAction, mode]
  );

  // Handle selecting a week - activates week filter mode
  const handleSelectWeek = useCallback(
    (weekKey: string) => {
      selectWeek(weekKey);
      selectAction("week");
    },
    [selectWeek, selectAction]
  );

  // Track if week filter is active
  const isWeekFilterActive = (mode === "games" || mode === "teams") && selectedAction === "week";

  // Determine effective structural filter - null if NOT in round/week mode
  const effectiveStructuralFilter =
    mode === "leagues" && !isRoundFilterActive
      ? null
      : (mode === "games" || mode === "teams") && !isWeekFilterActive
        ? null
        : structuralFilter;

  const { filteredFixtures, emptyState, hasAnyChips } = useFilteredFixtures({
    fixtures,
    selectedAction,
    structuralFilter: effectiveStructuralFilter,
    actionChips,
    selectAction: handleSelectAction,
    onNavigateToLeaderboard,
  });

  // Smart auto-selection: pick the best default filter based on mode and data
  useEffect(() => {
    if (hasAutoSelected.current || userHasChangedSelection.current) return;
    if (fixtures.length === 0 || actionChips.length === 0) return;

    hasAutoSelected.current = true;

    // Leagues: default to current round
    if (mode === "leagues" && structuralFilter?.type === "rounds") {
      setSelectedAction("round");
      return;
    }

    // Games/Teams: default to current week
    if ((mode === "games" || mode === "teams") && structuralFilter?.type === "weeks") {
      setSelectedAction("week");
      return;
    }

    // All modes: live games take priority
    if (actionChips.some((c) => c.id === "live")) {
      setSelectedAction("live");
      return;
    }

    // All modes: predict if there are games to predict
    if (actionChips.some((c) => c.id === "predict")) {
      setSelectedAction("predict");
      return;
    }

    // Fallback: "all" (already the initial state, no action needed)
  }, [fixtures.length, actionChips, mode, structuralFilter, setSelectedAction, userHasChangedSelection]);

  // Recovery effect: if current filter results in empty list, fall back to "all"
  useEffect(() => {
    if (filteredFixtures.length > 0 || fixtures.length === 0) return;
    if (selectedAction === "all") {
      setSelectedRound(null);
      setSelectedTeamId(null);
      setSelectedWeek(null);
      return;
    }
    // Current filter has no results, fall back to "all"
    setSelectedRound(null);
    setSelectedTeamId(null);
    setSelectedWeek(null);
    setSelectedAction("all");
  }, [
    filteredFixtures.length,
    fixtures.length,
    selectedAction,
    setSelectedAction,
    setSelectedRound,
    setSelectedTeamId,
    setSelectedWeek,
  ]);

  return {
    actionChips,
    selectedAction,
    selectAction: handleSelectAction,
    structuralFilter,
    selectTeam,
    selectCompetition,
    selectRound: handleSelectRound,
    navigateRound,
    selectWeek: handleSelectWeek,
    navigateWeek,
    filteredFixtures,
    hasAnyChips,
    emptyState,
  };
}
