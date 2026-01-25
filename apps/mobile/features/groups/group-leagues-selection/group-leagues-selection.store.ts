// features/groups/group-leagues-selection/group-leagues-selection.store.ts
// Jotai store for group leagues selection. No persistence.

import { atom } from "jotai";
import type { SelectedLeagueData } from "./group-leagues-selection.types";

export const selectedLeaguesAtom = atom<SelectedLeagueData[]>([]);

export const selectedLeaguesCountAtom = atom((get) => {
  return get(selectedLeaguesAtom).length;
});

export const hasSelectedLeaguesAtom = atom((get) => {
  return get(selectedLeaguesAtom).length > 0;
});
