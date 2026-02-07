// lib/theme/theme.resolver.ts
// Theme resolution logic.
// Maps system color scheme to theme variant.
// Pure function - no React, no hooks.

import { lightColors, darkColors, type ColorScheme } from "./colors";
import { opacity } from "./opacity";
import { radius } from "./radius";
import { shadows } from "./shadows";
import { spacing } from "./spacing";
import { typography } from "./typography";
import type { Theme, ThemeMode } from "./theme.types";

/**
 * Resolves the active color scheme based on theme mode and system preference.
 * @param mode - Theme mode ("system" | "light" | "dark")
 * @param systemColorScheme - System color scheme from useColorScheme()
 * @returns Active color scheme ("light" | "dark")
 */
export function resolveColorScheme(
  mode: ThemeMode,
  systemColorScheme: "light" | "dark" | null | undefined
): ColorScheme {
  if (mode === "light") return "light";
  if (mode === "dark") return "dark";
  // mode === "system"
  return systemColorScheme === "dark" ? "dark" : "light";
}

/**
 * Resolves the complete theme object based on color scheme.
 * @param colorScheme - Active color scheme
 * @returns Complete theme object
 */
export function resolveTheme(colorScheme: ColorScheme): Theme {
  const colors = colorScheme === "dark" ? darkColors : lightColors;

  return {
    colors,
    spacing,
    typography,
    radius,
    shadows,
    opacity,
    colorScheme,
  };
}
