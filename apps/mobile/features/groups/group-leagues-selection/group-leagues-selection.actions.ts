// features/groups/group-leagues-selection/group-leagues-selection.actions.ts
// Actions for group leagues selection. Max 1 league – toggle replaces.

import { jotaiStore } from "@/lib/state/jotaiStore";
import { selectedLeaguesAtom } from "./group-leagues-selection.store";
import type { SelectedLeagueData } from "./group-leagues-selection.types";

export function toggleLeague(league: SelectedLeagueData): void {
  const current = jotaiStore.get(selectedLeaguesAtom);
  const exists = current.some((l) => l.id === league.id);
  if (exists) {
    jotaiStore.set(selectedLeaguesAtom, []);
    return;
  }
  jotaiStore.set(selectedLeaguesAtom, [league]);
}

export function clearSelectedLeagues(): void {
  jotaiStore.set(selectedLeaguesAtom, []);
}
