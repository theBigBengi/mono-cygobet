// lib/theme/colors.ts
// Color tokens for light and dark themes.
// Pure data - no logic, no React, no hooks.

export type Colors = {
  // --- Surfaces ---
  /** רקע בסיסי של המסך */
  background: string;
  /** משטח sections ומיכלים */
  surface: string;
  /** כרטיסים בודדים (elevated מעל surface) */
  cardBackground: string;
  /** modals, sheets, floating elements (elevated מעל cards) */
  surfaceElevated: string;

  // --- Text ---
  /** טקסט ראשי */
  textPrimary: string;
  /** טקסט משני (metadata, subtitles) */
  textSecondary: string;
  /** טקסט disabled / placeholder */
  textDisabled: string;

  // --- Brand ---
  /** צבע ראשי — actions, links, selections */
  primary: string;
  /** טקסט על רקע primary */
  primaryText: string;

  // --- Semantic ---
  /** שגיאה, מחיקה, close */
  danger: string;
  /** טקסט על רקע danger */
  dangerText: string;
  /** הצלחה — prediction נכון, saved */
  success: string;
  /** אזהרה — partial match, attention */
  warning: string;
  /** LIVE indicator */
  live: string;

  // --- UI ---
  /** קווי הפרדה */
  border: string;
  /** iOS keyboard key background */
  keyboardKey: string;
  /** overlay רקע (modals, sheets) */
  overlay: string;
};
export const lightColors: Colors = {
  // Surfaces — רקע אפור ניטרלי קל, כרטיסים לבנים
  background: "#F6F6F6", // אפור ניטרלי קל — לא לבן טהור, לא כהה מדי
  surface: "#FFFFFF", // לבן — sections/containers
  cardBackground: "#FFFFFF", // לבן — כרטיסים בולטים על הרקע
  surfaceElevated: "#FFFFFF", // לבן — modals

  // Text — ניטרלי, בלי גוון כחול
  textPrimary: "#1A1A1A", // כמעט שחור, ניטרלי מלא
  textSecondary: "#888888", // אפור ניטרלי מאוזן
  textDisabled: "#CCCCCC", // אפור בהיר, ברור שזה disabled

  // Brand
  primary: "#007AFF",
  primaryText: "#FFFFFF",

  // Semantic
  danger: "#FF3B30",
  dangerText: "#FFFFFF",
  success: "#34C759",
  warning: "#FF9500",
  live: "#FF3B30",

  // UI
  border: "#EBEBEB", // קו הפרדה ניטרלי עדין
  keyboardKey: "rgba(255,255,255,0.85)",
  overlay: "rgba(0,0,0,0.3)",
};

export const darkColors: Colors = {
  // Surfaces — dark עם היררכיה עדינה
  background: "#101014",
  surface: "#1A1A20",
  cardBackground: "#222228",
  surfaceElevated: "#2A2A32",

  // Text
  textPrimary: "#F0F0F5",
  textSecondary: "#9CA3AF",
  textDisabled: "#4B5563",

  // Brand
  primary: "#0A84FF",
  primaryText: "#FFFFFF",

  // Semantic
  danger: "#FF453A",
  dangerText: "#FFFFFF",
  success: "#30D158",
  warning: "#FF9F0A",
  live: "#FF453A",

  // UI
  border: "#2E2E36",
  keyboardKey: "rgba(255,255,255,0.15)",
  overlay: "rgba(0,0,0,0.55)",
};

export type ColorScheme = "light" | "dark";
