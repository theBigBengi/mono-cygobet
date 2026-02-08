// lib/state/tabBarBadge.atom.ts
// Generic badge state for the floating tab bar home tab.
// Written by group-creation feature, read by FloatingTabBar.
// This decouples the tab bar from feature-specific knowledge.

import { atom } from "jotai";

export interface TabBarBadgeState {
  /** Whether to show a badge on the home tab */
  visible: boolean;
  /** Number to display in the badge */
  count: number;
  /** Called when the home tab is tapped while badge is visible and tab is focused */
  onActiveTap: (() => void) | null;
}

export const tabBarBadgeAtom = atom<TabBarBadgeState>({
  visible: false,
  count: 0,
  onActiveTap: null,
});
