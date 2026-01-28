// features/group-creation/hooks/useSelectionState.ts
// Selection state and label for create-group FAB by mode.

import {
  useSelectedGroupGames,
  useGroupGamesHydrated,
} from "@/features/group-creation/selection/games";
import {
  useSelectedLeaguesCount,
  useHasSelectedLeagues,
} from "@/features/group-creation/selection/leagues";
import {
  useSelectedTeamsCount,
  useHasSelectedTeams,
} from "@/features/group-creation/selection/teams";
import type { SelectionMode } from "../components/SelectionModeTabs";

export function useHasSelectionForMode(mode: SelectionMode): boolean {
  const hasGames = useSelectedGroupGames().hasAnyGame;
  const hydrated = useGroupGamesHydrated();
  const hasLeagues = useHasSelectedLeagues();
  const hasTeams = useHasSelectedTeams();

  if (mode === "fixtures") return !!hydrated && hasGames;
  if (mode === "leagues") return hasLeagues;
  if (mode === "teams") return hasTeams;
  return false;
}

export function useSelectionLabelForMode(mode: SelectionMode): string {
  const { count: gamesCount } = useSelectedGroupGames();
  const leaguesCount = useSelectedLeaguesCount();
  const teamsCount = useSelectedTeamsCount();

  if (mode === "fixtures")
    return gamesCount === 1 ? "1 Game" : `${gamesCount} Games`;
  if (mode === "leagues")
    return leaguesCount === 1 ? "1 League" : `${leaguesCount} Leagues`;
  if (mode === "teams")
    return teamsCount === 1 ? "1 Team" : `${teamsCount} Teams`;
  return "";
}
