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
  /** טקסט הפוך — לשימוש על רקע כהה ב-light ועל רקע בהיר ב-dark */
  textInverse: string;

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
  /** טקסט על רקע warning */
  warningText: string;
  /** LIVE indicator — כחול, סטטוס משחק חי */
  live: string;

  // --- Ranking ---
  /** מקום ראשון */
  gold: string;
  /** מקום שני */
  silver: string;
  /** מקום שלישי */
  bronze: string;

  // --- Accent ---
  /** streak / flame / highlight מיוחד */
  accent: string;

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
  background: "#FFFFFF", // לבן — אחיד עם surface
  surface: "#FFFFFF", // לבן — sections/containers
  cardBackground: "#F2F2F3", // אפור ניטרלי עדין — כרטיסים בולטים על הרקע
  surfaceElevated: "#FFFFFF", // לבן — modals

  // Text — ניטרלי, בלי גוון כחול
  textPrimary: "#1A1A1A", // כמעט שחור, ניטרלי מלא
  textSecondary: "#888888", // אפור ניטרלי מאוזן
  textDisabled: "#CCCCCC", // אפור בהיר, ברור שזה disabled
  textInverse: "#FFFFFF", // לבן — על רקעים כהים

  // Brand
  primary: "#007AFF",
  primaryText: "#FFFFFF",

  // Semantic
  danger: "#FF3B30",
  dangerText: "#FFFFFF",
  success: "#34C759",
  warning: "#FF9500",
  warningText: "#663C00",
  live: "#3B82F6", // כחול — סטטוס LIVE

  // Ranking
  gold: "#FFD700",
  silver: "#C0C0C0",
  bronze: "#CD7F32",

  // Accent
  accent: "#F97316", // כתום — streak, flame

  // UI
  border: "#EBEBEB", // קו הפרדה ניטרלי עדין
  keyboardKey: "rgba(255,255,255,0.85)",
  overlay: "rgba(0,0,0,0.3)",
};

export const darkColors: Colors = {
  // Surfaces — dark בסגנון ספוטיפיי
  background: "#121212",
  surface: "#181818",
  cardBackground: "#2C2C2C",
  surfaceElevated: "#282828",

  // Text
  textPrimary: "#F8F8FF",
  textSecondary: "#9CA3AF",
  textDisabled: "#4B5563",
  textInverse: "#1A1A1A", // כהה — על רקעים בהירים

  // Brand
  primary: "#0A84FF",
  primaryText: "#FFFFFF",

  // Semantic
  danger: "#FF453A",
  dangerText: "#FFFFFF",
  success: "#30D158",
  warning: "#FF9F0A",
  warningText: "#FFD60A",
  live: "#60A5FA", // כחול בהיר יותר ל-dark mode

  // Ranking
  gold: "#FFD700",
  silver: "#D1D5DB",
  bronze: "#D4956A",

  // Accent
  accent: "#FB923C", // כתום בהיר יותר ל-dark mode

  // UI
  border: "#2E2E36",
  keyboardKey: "rgba(255,255,255,0.15)",
  overlay: "rgba(0,0,0,0.55)",
};

export type ColorScheme = "light" | "dark";
