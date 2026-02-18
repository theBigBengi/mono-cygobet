// lib/state/activeGroup.atom.ts
// Tracks the group ID the user is currently viewing.
// Used to suppress in-app chat toast notifications for the active group.

import { atom } from "jotai";

/**
 * Currently viewed group ID.
 * - number: user is inside a group screen
 * - null: user is not viewing any group
 */
export const activeGroupIdAtom = atom<number | null>(null);
