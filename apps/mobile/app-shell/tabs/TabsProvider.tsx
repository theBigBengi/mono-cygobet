// src/app-shell/tabs/TabsProvider.tsx
// Tabs context provider component.
// Wraps the app to provide tabs state.

import React, { useState, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import type { TabId, TabNavigationState } from "./tabs.types";
import { getDefaultTab, TABS_CONFIG } from "./tabs.config";
import { TabsContext } from "./tabs.store";

interface TabsProviderProps {
  children: ReactNode;
  /** Initial active tab (optional, defaults to "games") */
  initialTab?: TabId;
}

/**
 * Initialize navigation state with root routes for each tab.
 */
function createInitialNavigationState(): TabNavigationState {
  const lastRoutes: Record<TabId, string> = {} as Record<TabId, string>;
  TABS_CONFIG.forEach((tab) => {
    lastRoutes[tab.id] = tab.rootRoute;
  });
  return { lastRoutes };
}

export function TabsProvider({
  children,
  initialTab = getDefaultTab(),
}: TabsProviderProps) {
  const [activeTab, setActiveTabState] = useState<TabId>(initialTab);
  const [navigation, setNavigationState] = useState<TabNavigationState>(
    createInitialNavigationState
  );

  const setActiveTab = useCallback((tabId: TabId) => {
    setActiveTabState(tabId);
  }, []);

  const updateTabRoute = useCallback((tabId: TabId, route: string) => {
    setNavigationState((prev) => ({
      ...prev,
      lastRoutes: {
        ...prev.lastRoutes,
        [tabId]: route,
      },
    }));
  }, []);

  const getTabLastRoute = useCallback(
    (tabId: TabId): string => {
      return navigation.lastRoutes[tabId] || TABS_CONFIG.find((t) => t.id === tabId)?.rootRoute || "/";
    },
    [navigation]
  );

  const state = useMemo(
    () => ({
      activeTab,
      navigation,
    }),
    [activeTab, navigation]
  );

  const value = useMemo(
    () => ({
      state,
      setActiveTab,
      updateTabRoute,
      getTabLastRoute,
    }),
    [state, setActiveTab, updateTabRoute, getTabLastRoute]
  );

  return (
    <TabsContext.Provider value={value}>{children}</TabsContext.Provider>
  );
}

