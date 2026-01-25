// components/Fixtures/styles.ts
// Fixture-specific styles for fixture components.
// Theme-aware styles using useTheme() hook.

import { StyleSheet } from "react-native";
import { useTheme } from "@/lib/theme";

// Layout styles (theme-independent)
export const fixtureStyles = StyleSheet.create({
  headerRow: {
    marginBottom: 8, // spacing.sm
  },
  teamSection: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4, // spacing.xs
  },
  teamName: {
    flex: 1,
  },
  kickoffSection: {
    alignItems: "center" as const,
    minWidth: 80,
  },
  kickoffTime: {
    fontWeight: "600" as const,
  },
  divider: {
    marginVertical: 8, // spacing.sm
  },
  oddsRow: {
    gap: 4, // spacing.xs
  },
  oddsButtonContent: {
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    height: "100%",
  },
  oddsValue: {
    fontWeight: "600" as const,
  },
});

// Theme-aware styles (color-dependent)
export function useFixtureThemeStyles() {
  const { theme } = useTheme();

  return {
    oddsButton: {
      flex: 1,
      height: 60,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
    },
    oddsButtonPressed: {
      opacity: 0.7,
      backgroundColor: theme.colors.border,
    },
    oddsButtonSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    oddsLabelSelected: {
      color: theme.colors.primaryText,
      fontWeight: "600" as const,
    },
    oddsValueSelected: {
      color: theme.colors.primaryText,
    },
  };
}
