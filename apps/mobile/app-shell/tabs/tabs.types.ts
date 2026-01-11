// src/app-shell/tabs/tabs.types.ts
// All types for the tabs system.
// No business logic, only type definitions.

import type { AppBarVariant } from "../appbar/AppBar.types";

/**
 * Tab identifier.
 * Each tab has a unique ID.
 */
export type TabId = "games" | "explore" | "profile";

/**
 * Tab configuration.
 * Defines the static properties of each tab.
 */
export interface TabConfig {
  /** Unique tab identifier */
  id: TabId;
  /** Tab label (displayed in the tab bar) */
  label: string;
  /** Tab icon name (will be rendered with @expo/vector-icons in BottomTabs) */
  icon: string;
  /** Root route for this tab's navigation stack */
  rootRoute: string;
  /** Default AppBar preset for this tab */
  defaultAppBarVariant: AppBarVariant;
  /** Default AppBar visibility for this tab */
  defaultAppBarVisible: boolean;
}

/**
 * Tab navigation state.
 * Tracks the last visited route for each tab.
 */
export interface TabNavigationState {
  /** Last visited route for each tab */
  lastRoutes: Record<TabId, string>;
}

/**
 * Tab state.
 * Tracks the active tab and navigation state.
 */
export interface TabsState {
  /** Currently active tab */
  activeTab: TabId;
  /** Navigation state per tab */
  navigation: TabNavigationState;
}

