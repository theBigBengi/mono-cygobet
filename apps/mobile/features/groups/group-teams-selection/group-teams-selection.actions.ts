// features/groups/group-teams-selection/group-teams-selection.actions.ts
// Actions for group teams selection. Toggle add/remove.

import { jotaiStore } from "@/lib/state/jotaiStore";
import { selectedTeamsAtom } from "./group-teams-selection.store";
import type { SelectedTeamData } from "./group-teams-selection.types";

export function toggleTeam(team: SelectedTeamData): void {
  const current = jotaiStore.get(selectedTeamsAtom);
  const exists = current.some((t) => t.id === team.id);
  if (exists) {
    jotaiStore.set(
      selectedTeamsAtom,
      current.filter((t) => t.id !== team.id)
    );
    return;
  }
  jotaiStore.set(selectedTeamsAtom, [...current, team]);
}

export function clearSelectedTeams(): void {
  jotaiStore.set(selectedTeamsAtom, []);
}
