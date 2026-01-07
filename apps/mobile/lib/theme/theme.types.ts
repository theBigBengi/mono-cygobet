// lib/theme/theme.types.ts
// Type definitions for theme system.

import type { ColorScheme } from "./colors";

export type ThemeMode = "system" | "light" | "dark";

export interface Theme {
  colors: typeof import("./colors").lightColors;
  spacing: typeof import("./spacing").spacing;
  typography: typeof import("./typography").typography;
  radius: typeof import("./radius").radius;
  colorScheme: ColorScheme;
}

