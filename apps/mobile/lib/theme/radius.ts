// lib/theme/radius.ts
// Border radius tokens.
// Pure data - no logic, no React, no hooks.

export const radius = {
  /** 6px — small elements (badges, chips) */
  xs: 6,
  /** 8px — compact elements */
  s: 8,
  /** 10px — standard rounding */
  sm: 10,
  /** 14px — cards, inputs */
  md: 14,
  /** 18px — large cards, modals */
  lg: 18,
  /** 24px — pills, rounded buttons */
  xl: 24,
  /** 9999px — full circle / pill */
  full: 9999,
} as const;

