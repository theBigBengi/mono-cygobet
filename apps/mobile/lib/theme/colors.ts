// lib/theme/colors.ts
// Color tokens for light and dark themes.
// Pure data - no logic, no React, no hooks.

export type Colors = {
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  primary: string;
  primaryText: string;
  border: string;
  danger: string;
  dangerText: string;
  cardBackground: string;
  /** iOS-style keyboard key background (light/dark). */
  keyboardKey: string;
};

export const lightColors: Colors = {
  background: "#FFFFFF",
  surface: "#F5F5F5",
  textPrimary: "#000000",
  textSecondary: "#666666",
  primary: "#007AFF",
  primaryText: "#FFFFFF",
  border: "#e3e3e3",
  danger: "#FF3B30",
  dangerText: "#FFFFFF",
  cardBackground: "#fbfbfb",
   keyboardKey: "rgba(255,255,255,0.8)",
};

export const darkColors: Colors = {
  background: "#000000",
  surface: "#1C1C1E",
  textPrimary: "#FFFFFF",
  textSecondary: "#999999",
  primary: "#0A84FF",
  primaryText: "#FFFFFF",
  border: "#38383A",
  danger: "#FF453A",
  dangerText: "#FFFFFF",
  cardBackground: "#1C1C1E",
  keyboardKey: "rgba(255,255,255,0.2)",};

export type ColorScheme = "light" | "dark";
