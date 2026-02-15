// hooks/useSmartFilters.ts
// Thin orchestrator: composes useActionChips, useStructuralFilter, useFilteredFixtures.
// Preserves auto-selection and recovery effects. Same public API as before.

import { useEffect, useCallback } from "react";
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
  } = useActionChips({ fixtures, mode });

  const {
    structuralFilter,
    selectTeam,
    selectCompetition,
    selectRound,
    navigateRound,
    setSelectedRound,
    setSelectedTeamId,
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

  // Determine effective structural filter - null if NOT in round mode for leagues
  const effectiveStructuralFilter =
    mode === "leagues" && !isRoundFilterActive ? null : structuralFilter;

  const { filteredFixtures, emptyState, hasAnyChips } = useFilteredFixtures({
    fixtures,
    selectedAction,
    structuralFilter: effectiveStructuralFilter,
    actionChips,
    selectAction: handleSelectAction,
    onNavigateToLeaderboard,
  });

  // Recovery effect: if current filter results in empty list, fall back to "all"
  useEffect(() => {
    if (filteredFixtures.length > 0 || fixtures.length === 0) return;
    if (selectedAction === "all") {
      setSelectedRound(null);
      setSelectedTeamId(null);
      return;
    }
    // Current filter has no results, fall back to "all"
    setSelectedRound(null);
    setSelectedTeamId(null);
    setSelectedAction("all");
  }, [
    filteredFixtures.length,
    fixtures.length,
    selectedAction,
    setSelectedAction,
    setSelectedRound,
    setSelectedTeamId,
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
    filteredFixtures,
    hasAnyChips,
    emptyState,
  };
}
