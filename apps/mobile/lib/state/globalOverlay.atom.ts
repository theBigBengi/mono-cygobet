// lib/state/globalOverlay.atom.ts
// Jotai atom for managing global blocking overlay state.
// Used to show a full-screen overlay during group creation.

import { atom } from "jotai";

/**
 * Global blocking overlay atom
 * - string: overlay is visible with message (blocks entire screen)
 * - false: overlay is hidden
 */
export const globalBlockingOverlayAtom = atom<string | false>(false);
