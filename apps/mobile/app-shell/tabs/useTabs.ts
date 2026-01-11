// src/app-shell/tabs/useTabs.ts
// Public API hook for screens to interact with tabs.
// This is the ONLY public API - screens must not access internal store directly.

import { useTabsStore } from "./tabs.store";
import { getTabConfig } from "./tabs.config";
import type { TabId } from "./tabs.types";

/**
 * Public hook for screens to interact with tabs.
 *
 * **Usage:**
 * ```tsx
 * const { activeTab, switchTab } = useTabs();
 *
 * // Switch to a different tab
 * switchTab("explore");
 *
 * // Check current tab
 * if (activeTab === "games") {
 *   // ...
 * }
 * ```
 *
 * **Rules:**
 * - Screens can read active tab and switch tabs
 * - Screens must NOT render BottomTabs directly
 * - Screens must NOT mutate tab state outside this hook
 */
export function useTabs() {
  const { state, setActiveTab } = useTabsStore();
  const activeTab = state.activeTab;

  const switchTab = (tabId: TabId) => {
    setActiveTab(tabId);
  };

  const getTabConfigHelper = (tabId: TabId) => {
    return getTabConfig(tabId);
  };

  return {
    /** Currently active tab ID */
    activeTab,
    /** Switch to a different tab */
    switchTab,
    /** Get configuration for a specific tab */
    getTabConfig: getTabConfigHelper,
  };
}

