// lib/theme/opacity.ts
// Opacity tokens for interactive states and disabled/inactive UI.

export const opacity = {
  /** Pressed state for interactive elements */
  pressed: 0.7,
  /** Disabled elements */
  disabled: 0.4,
  /** Subtle hover/focus hint */
  hover: 0.85,
  /** Cancelled/inactive games */
  inactive: 0.6,
} as const;
