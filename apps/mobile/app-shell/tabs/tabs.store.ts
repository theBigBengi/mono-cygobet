// src/app-shell/tabs/tabs.store.ts
// Internal store for tabs state management.
// Not exported - screens should use useTabs hook.

import { createContext, useContext } from "react";
import type { TabId, TabsState } from "./tabs.types";

export interface TabsContextValue {
  /** Current tabs state */
  state: TabsState;
  /** Set the active tab */
  setActiveTab: (tabId: TabId) => void;
  /** Update the last route for a tab */
  updateTabRoute: (tabId: TabId, route: string) => void;
  /** Get the last route for a tab (or root if none) */
  getTabLastRoute: (tabId: TabId) => string;
}

/**
 * Tabs context (created once at module level).
 */
export const TabsContext = createContext<TabsContextValue | null>(null);

/**
 * Internal hook to access tabs store.
 * Not exported - screens should use useTabs instead.
 */
export function useTabsStore(): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("useTabsStore must be used within a TabsProvider");
  }
  return context;
}
