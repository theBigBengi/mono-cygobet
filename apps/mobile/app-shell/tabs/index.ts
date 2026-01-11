// src/app-shell/tabs/index.ts
// Barrel exports for tabs module.
// Only exports public API - internal implementation is hidden.

// Components
export { BottomTabs } from "./BottomTabs";
export { TabsProvider } from "./TabsProvider";

// Public API hook (ONLY public API for screens)
export { useTabs } from "./useTabs";

// Internal hook for route tracking (used by AppShell)
export { useTabNavigation } from "./useTabNavigation";

// Types (public API)
export type { TabId, TabConfig } from "./tabs.types";

// Config helpers (for reference)
export { TABS_CONFIG, TAB_ICONS, getTabConfig, getDefaultTab } from "./tabs.config";
export type { TabIconConfig } from "./tabs.config";

// Constants (for calculating padding/spacing)
export { TAB_BAR_HEIGHT, getTabBarTotalHeight } from "./tabs.constants";

// Do NOT export internal implementation details:
// - tabs.store.ts (internal hooks)
// - Internal context/store structure

