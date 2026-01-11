// src/app-shell/tabs/useTabNavigation.ts
// Hook to track route changes and update tab navigation history.
// Should be called in a component that has access to current route.

import { useEffect, useRef } from "react";
import { usePathname } from "expo-router";
import { useTabsStore } from "./tabs.store";
import { TABS_CONFIG } from "./tabs.config";

/**
 * Hook to track route changes and update tab navigation history.
 * This hook should be called in a component that's always mounted (like AppShell).
 * It automatically updates the last route for the active tab when navigation occurs.
 */
export function useTabNavigation() {
  const pathname = usePathname();
  const { state, updateTabRoute } = useTabsStore();
  const activeTabRef = useRef(state.activeTab);
  const pathnameRef = useRef(pathname);

  // Update activeTab ref when it changes
  useEffect(() => {
    activeTabRef.current = state.activeTab;
  }, [state.activeTab]);

  // Track route changes and update tab history
  useEffect(() => {
    const currentTab = activeTabRef.current;
    const currentPathname = pathname;

    // Only update if pathname actually changed (not just re-render)
    if (pathnameRef.current === currentPathname) {
      return;
    }

    pathnameRef.current = currentPathname;

    // Find which tab this route belongs to
    const tabForRoute = TABS_CONFIG.find((tab) => {
      // Check if the route belongs to this tab's route group
      // For example, "/(protected)/index" belongs to "games" tab
      return currentPathname.startsWith(tab.rootRoute);
    });

    // Only update if:
    // 1. The route belongs to a tab (not auth/onboarding/modal)
    // 2. The route is actually within the protected routes (tab routes)
    if (tabForRoute && currentPathname.startsWith("/(protected)")) {
      // Update the last route for the tab that owns this route
      // This allows restoring the last visited route when switching tabs
      updateTabRoute(tabForRoute.id, currentPathname);
    }
  }, [pathname, updateTabRoute]);
}


