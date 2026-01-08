// components/ui/styles.ts
// Shared styles for common UI patterns.
// Screens should import and use these instead of creating their own.
// Spacing-based styles are constants (theme-independent).
// Color-based styles are functions that use theme.

import { StyleSheet } from "react-native";
import { useTheme } from "@/lib/theme";

// Spacing-based styles (theme-independent)
export const sharedStyles = StyleSheet.create({
  sectionGap: {
    marginBottom: 24, // spacing.lg
  },
  listGap: {
    marginBottom: 8, // spacing.sm
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  titleMargin: {
    marginBottom: 8, // spacing.sm
  },
  subtitleMargin: {
    marginBottom: 24, // spacing.lg
  },
  buttonContainer: {
    marginTop: 24, // spacing.lg
  },
  emptyTextMargin: {
    marginTop: 16, // spacing.md
  },
  cardMargin: {
    marginBottom: 24, // spacing.lg
  },
  profileTitle: {
    marginBottom: 24, // spacing.lg
    textAlign: "center" as const,
  },
  labelMargin: {
    marginBottom: 4, // spacing.xs
  },
  sectionTitleMargin: {
    marginBottom: 8, // spacing.sm
  },
  // FixtureCard layout styles (theme-independent)
  fixtureHeaderRow: {
    marginBottom: 8, // spacing.sm
  },
  fixtureTeamSection: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4, // spacing.xs
  },
  fixtureTeamName: {
    flex: 1,
  },
  fixtureKickoffSection: {
    alignItems: "center" as const,
    minWidth: 80,
  },
  fixtureKickoffTime: {
    fontWeight: "600" as const,
  },
  fixtureDivider: {
    marginVertical: 8, // spacing.sm
  },
  fixtureOddsRow: {
    gap: 4, // spacing.xs
  },
  fixtureOddsButtonContent: {
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    height: "100%",
  },
  fixtureOddsValue: {
    fontWeight: "600" as const,
  },
});

// Color-dependent styles (theme-aware)
// These must be used within components that have access to useTheme()
export function useFixtureStyles() {
  const { theme } = useTheme();

  return {
    fixtureOddsButton: {
      flex: 1,
      height: 40,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
    },
    fixtureOddsButtonPressed: {
      opacity: 0.7,
      backgroundColor: theme.colors.border,
    },
    fixtureOddsButtonSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    fixtureOddsLabelSelected: {
      color: theme.colors.primaryText,
      fontWeight: "600" as const,
    },
    fixtureOddsValueSelected: {
      color: theme.colors.primaryText,
    },
  };
}
