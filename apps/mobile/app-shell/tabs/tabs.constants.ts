// src/app-shell/tabs/tabs.constants.ts
// Constants for the tabs system.

/**
 * Tab bar height (excluding safe area padding).
 * This is the fixed height of the tab bar content.
 */
export const TAB_BAR_HEIGHT = 56;

/**
 * Calculate the total height needed for the tab bar including safe area.
 * This is used to add proper bottom padding to content that needs to clear the tabs.
 *
 * @param bottomInset - Bottom safe area inset (from useSafeAreaInsets)
 * @returns Total height needed to account for tabs
 */
export function getTabBarTotalHeight(bottomInset: number): number {
  return TAB_BAR_HEIGHT + bottomInset;
}


