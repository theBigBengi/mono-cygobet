// components/ui/styles.ts
// Shared styles for common UI patterns.
// Screens should import and use these instead of creating their own.

import { StyleSheet } from "react-native";
import { spacing, colors, radius } from "@/theme";

export const sharedStyles = StyleSheet.create({
  sectionGap: {
    marginBottom: spacing.lg,
  },
  listGap: {
    marginBottom: spacing.sm,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  titleMargin: {
    marginBottom: spacing.sm,
  },
  subtitleMargin: {
    marginBottom: spacing.lg,
  },
  buttonContainer: {
    marginTop: spacing.lg,
  },
  emptyTextMargin: {
    marginTop: spacing.md,
  },
  cardMargin: {
    marginBottom: spacing.lg,
  },
  profileTitle: {
    marginBottom: spacing.lg,
    textAlign: "center" as const,
  },
  labelMargin: {
    marginBottom: spacing.xs,
  },
  sectionTitleMargin: {
    marginBottom: spacing.sm,
  },
  // FixtureCard specific styles
  fixtureHeaderRow: {
    marginBottom: spacing.sm,
  },
  fixtureTeamSection: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.xs,
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
    marginVertical: spacing.sm,
  },
  fixtureOddsRow: {
    gap: spacing.xs,
  },
  fixtureOddsButton: {
    flex: 1,
    height: 60,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  fixtureOddsButtonContent: {
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    height: "100%",
  },
  fixtureOddsButtonPressed: {
    opacity: 0.7,
    backgroundColor: colors.border,
  },
  fixtureOddsButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  fixtureOddsLabelSelected: {
    color: colors.primaryText,
    fontWeight: "600" as const,
  },
  fixtureOddsValueSelected: {
    color: colors.primaryText,
  },
  fixtureOddsValue: {
    fontWeight: "600" as const,
  },
});
