// src/app-shell/tabs/tabs.config.tsx
// Static configuration for the three tabs.
// Defines icons, routes, and default AppBar presets.
//
// NOTE: Icons use @expo/vector-icons. Icons are defined as icon names and will be
// rendered with theme colors in BottomTabs based on active/inactive state.

import type { TabConfig, TabId } from "./tabs.types";

/**
 * Icon configuration for tabs.
 * Each tab defines an icon family and name from @expo/vector-icons.
 */
export interface TabIconConfig {
  /** Icon family (e.g., "Ionicons", "MaterialIcons", etc.) */
  family:
    | "Ionicons"
    | "MaterialIcons"
    | "MaterialCommunityIcons"
    | "FontAwesome"
    | "Feather";
  /** Icon name within the family */
  name: string;
}

/**
 * Tab icon configurations.
 */
export const TAB_ICONS: Record<TabId, TabIconConfig> = {
  games: {
    family: "Ionicons",
    name: "football-outline",
  },
  explore: {
    family: "Ionicons",
    name: "search",
  },
  profile: {
    family: "Ionicons",
    name: "person",
  },
};

/**
 * Tab configurations.
 * Three tabs: Games (left), Explore (middle), Profile (right).
 */
export const TABS_CONFIG: TabConfig[] = [
  {
    id: "games",
    label: "Games",
    icon: "football-outline", // Icon name - will be rendered with theme colors in BottomTabs
    rootRoute: "/(protected)",
    defaultAppBarVariant: "default",
    defaultAppBarVisible: true,
  },
  {
    id: "explore",
    label: "Explore",
    icon: "search", // Icon name - will be rendered with theme colors in BottomTabs
    rootRoute: "/(protected)/explore",
    defaultAppBarVariant: "default",
    defaultAppBarVisible: true,
  },
  {
    id: "profile",
    label: "Profile",
    icon: "person", // Icon name - will be rendered with theme colors in BottomTabs
    rootRoute: "/(protected)/profile",
    defaultAppBarVariant: "default",
    defaultAppBarVisible: true,
  },
];

/**
 * Get tab configuration by ID.
 */
export function getTabConfig(tabId: TabId): TabConfig {
  const config = TABS_CONFIG.find((tab) => tab.id === tabId);
  if (!config) {
    throw new Error(`Tab config not found for tabId: ${tabId}`);
  }
  return config;
}

/**
 * Get default tab (Games).
 */
export function getDefaultTab(): TabId {
  return "games";
}
