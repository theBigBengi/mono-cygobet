// features/home/hooks/useCreationSelection.ts
// Selection state and label for create-group FAB by mode.

import {
  useSelectedGroupGames,
  useGroupGamesHydrated,
} from "@/features/groups/games-selection";
import {
  useSelectedLeaguesCount,
  useHasSelectedLeagues,
} from "@/features/groups/group-leagues-selection";
import {
  useSelectedTeamsCount,
  useHasSelectedTeams,
} from "@/features/groups/group-teams-selection";
import type { HomeMode } from "../components/HomeModeSelector";

export function useHasSelectionForMode(mode: HomeMode): boolean {
  const hasGames = useSelectedGroupGames().hasAnyGame;
  const hydrated = useGroupGamesHydrated();
  const hasLeagues = useHasSelectedLeagues();
  const hasTeams = useHasSelectedTeams();

  if (mode === "fixtures") return !!hydrated && hasGames;
  if (mode === "leagues") return hasLeagues;
  if (mode === "teams") return hasTeams;
  return false;
}

export function useSelectionLabelForMode(mode: HomeMode): string {
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
