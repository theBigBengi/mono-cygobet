// src/app-shell/appbar/appBar.presets.ts
// AppBar preset variants and style definitions.
// Centralized presets prevent one-off styles across screens.

import type { ViewStyle, TextStyle } from "react-native";
import type { Theme } from "@/lib/theme";

/**
 * AppBar preset styles.
 * Each preset defines: background, border, elevation/blur, text color, height, padding.
 */
export interface AppBarPresetStyles {
  container: ViewStyle;
  text: TextStyle;
  height: number;
  padding: {
    horizontal: number;
    vertical: number;
  };
}

/**
 * Get preset styles for the given variant.
 * Theme-aware function that accepts theme and returns styles.
 */
export function getAppBarPresetStyles(
  variant: "default" | "transparent" | "elevated",
  theme: Theme
): AppBarPresetStyles {
  switch (variant) {
    case "default": {
      return {
        container: {
          backgroundColor: theme.colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        text: {
          color: theme.colors.textPrimary,
        },
        height: 56,
        padding: {
          horizontal: theme.spacing.md,
          vertical: theme.spacing.sm,
        },
      };
    }
    case "transparent": {
      return {
        container: {
          backgroundColor: "transparent",
          borderBottomWidth: 0,
        },
        text: {
          color: theme.colors.textPrimary,
        },
        height: 56,
        padding: {
          horizontal: theme.spacing.md,
          vertical: theme.spacing.sm,
        },
      };
    }
    case "elevated": {
      return {
        container: {
          backgroundColor: theme.colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 4,
        },
        text: {
          color: theme.colors.textPrimary,
        },
        height: 56,
        padding: {
          horizontal: theme.spacing.md,
          vertical: theme.spacing.sm,
        },
      };
    }
  }
}
