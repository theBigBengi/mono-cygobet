// lib/theme/theme.types.ts
// Type definitions for theme system.

import type { ColorScheme, Colors } from "./colors";

export type ThemeMode = "system" | "light" | "dark";

export interface Theme {
  colors: Colors;
  spacing: typeof import("./spacing").spacing;
  typography: typeof import("./typography").typography;
  radius: typeof import("./radius").radius;
  shadows: typeof import("./shadows").shadows;
  opacity: typeof import("./opacity").opacity;
  colorScheme: ColorScheme;
}
