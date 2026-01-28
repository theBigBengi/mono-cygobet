// lib/state/globalOverlay.atom.ts
// Jotai atom for managing global blocking overlay state.
// Used to show a full-screen overlay during group creation.

import { atom } from "jotai";

/**
 * Global blocking overlay atom
 * - true: overlay is visible (blocks entire screen)
 * - false: overlay is hidden
 */
export const globalBlockingOverlayAtom = atom<boolean>(false);
