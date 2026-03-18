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
  // Surfaces — רקע אפור-כחלחל עדין, כרטיסים לבנים צפים מעל
  background: "#F2F4F7", // אפור-כחלחל עדין — מודרני, נותן עומק
  surface: "#FFFFFF", // לבן — sections/containers צפים מעל הרקע
  cardBackground: "#FFFFFF", // לבן — כרטיסים עם צל במקום border
  surfaceElevated: "#FFFFFF", // לבן — modals

  // Text — ניטרלי עם עומק טוב יותר
  textPrimary: "#111827", // כהה עמוק אבל לא שחור טהור
  textSecondary: "#6B7280", // אפור מאוזן — ברור וקריא
  textDisabled: "#D1D5DB", // אפור בהיר, ברור שזה disabled
  textInverse: "#FFFFFF", // לבן — על רקעים כהים

  // Brand
  primary: "#007AFF",
  primaryText: "#FFFFFF",

  // Semantic
  danger: "#EF4444",
  dangerText: "#FFFFFF",
  success: "#22C55E",
  warning: "#F59E0B",
  warningText: "#78350F",
  live: "#3B82F6", // כחול — סטטוס LIVE

  // Ranking
  gold: "#EAB308",
  silver: "#9CA3AF",
  bronze: "#D97706",

  // Accent
  accent: "#F97316", // כתום — streak, flame

  // UI
  border: "#E5E7EB", // קו הפרדה עדין ומודרני
  keyboardKey: "rgba(255,255,255,0.85)",
  overlay: "rgba(0,0,0,0.4)",
};

export const darkColors: Colors = {
  // Surfaces — dark מודרני בסגנון zinc
  background: "#09090B",
  surface: "#18181B",
  cardBackground: "#1F1F23",
  surfaceElevated: "#27272A",

  // Text
  textPrimary: "#FAFAFA",
  textSecondary: "#A1A1AA",
  textDisabled: "#52525B",
  textInverse: "#18181B", // כהה — על רקעים בהירים

  // Brand
  primary: "#0A84FF",
  primaryText: "#FFFFFF",

  // Semantic
  danger: "#F87171",
  dangerText: "#FFFFFF",
  success: "#4ADE80",
  warning: "#FBBF24",
  warningText: "#FEF3C7",
  live: "#60A5FA", // כחול בהיר יותר ל-dark mode

  // Ranking
  gold: "#FACC15",
  silver: "#D4D4D8",
  bronze: "#FB923C",

  // Accent
  accent: "#FB923C", // כתום בהיר יותר ל-dark mode

  // UI
  border: "#27272A",
  keyboardKey: "rgba(255,255,255,0.12)",
  overlay: "rgba(0,0,0,0.6)",
};

export type ColorScheme = "light" | "dark";
