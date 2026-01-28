// features/group-creation/selection/mode.atom.ts
// Global atom to store the current selection mode

import { atom } from "jotai";
import type { SelectionMode } from "../components/SelectionModeTabs";

export const currentSelectionModeAtom = atom<SelectionMode>("fixtures");
