// src/app-shell/appbar/AppBar.constants.ts
// AppBar design policy constants.
// These values define the layout constraints and should not be changed without design review.

/**
 * Reserved side width policy.
 *
 * DESIGN POLICY:
 * - Each side (left/right) supports ONE control button by default.
 * - Standard button size: 44px (iOS/Android touch target minimum).
 * - Additional padding: 8px on each side for comfortable spacing.
 * - Total reserved width: 60px per side.
 *
 * ENFORCEMENT:
 * - Center overlay padding uses this value to prevent overlap with side controls.
 * - Screens should not exceed this width for side slot content.
 * - If a screen needs wider side content, it must account for center overlap risk.
 *
 * FUTURE CONSIDERATION:
 * - Could be made dynamic based on preset (e.g., larger for elevated variant).
 * - Could be configurable per-screen if needed (not recommended).
 */
export const RESERVED_SIDE_WIDTH = 60;

/**
 * Minimum touch target size (iOS/Android guidelines).
 * Used to ensure side buttons meet accessibility requirements.
 */
export const MIN_TOUCH_TARGET_SIZE = 44;


