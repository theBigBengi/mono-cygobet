// lib/theme/radius.ts
// Border radius tokens.
// Pure data - no logic, no React, no hooks.

export const radius = {
  /** 4px — small elements (badges, chips) */
  xs: 4,
  /** 6px — compact elements */
  s: 6,
  /** 8px — standard rounding */
  sm: 8,
  /** 12px — cards, inputs */
  md: 12,
  /** 16px — large cards, modals */
  lg: 16,
  /** 20px — pills, rounded buttons */
  xl: 20,
  /** 9999px — full circle / pill */
  full: 9999,
} as const;

