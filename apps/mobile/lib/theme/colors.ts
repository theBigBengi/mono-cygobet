// lib/theme/colors.ts
// Color tokens for light and dark themes.
// Pure data - no logic, no React, no hooks.

export const lightColors = {
  background: "#FFFFFF",
  surface: "#F5F5F5",
  textPrimary: "#000000",
  textSecondary: "#666666",
  primary: "#007AFF",
  primaryText: "#FFFFFF",
  border: "#DDDDDD",
  danger: "#FF3B30",
  dangerText: "#FFFFFF",
} as const;

export const darkColors = {
  background: "#000000",
  surface: "#1C1C1E",
  textPrimary: "#FFFFFF",
  textSecondary: "#999999",
  primary: "#0A84FF",
  primaryText: "#FFFFFF",
  border: "#38383A",
  danger: "#FF453A",
  dangerText: "#FFFFFF",
} as const;

export type ColorScheme = "light" | "dark";

export type Colors = typeof lightColors;

