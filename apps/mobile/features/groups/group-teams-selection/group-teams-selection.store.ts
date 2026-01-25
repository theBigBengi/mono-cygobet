// features/groups/group-teams-selection/group-teams-selection.store.ts
// Jotai store for group teams selection. No persistence.

import { atom } from "jotai";
import type { SelectedTeamData } from "./group-teams-selection.types";

export const selectedTeamsAtom = atom<SelectedTeamData[]>([]);

export const selectedTeamsCountAtom = atom((get) => {
  return get(selectedTeamsAtom).length;
});

export const hasSelectedTeamsAtom = atom((get) => {
  return get(selectedTeamsAtom).length > 0;
});
