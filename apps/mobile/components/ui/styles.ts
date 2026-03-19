// components/ui/styles.ts
// Shared styles for common UI patterns.
// Screens should import and use these instead of creating their own.
// Spacing-based styles are constants (theme-independent).

import { StyleSheet } from "react-native";

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
  /** Section header: 15px bold, inside card */
  sectionHeader: {
    fontSize: 15,
    fontWeight: "700" as const,
    marginBottom: 8, // spacing.sm
  },
  /** "See all" action text */
  seeAllText: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  /** Screen horizontal padding */
  screenPadding: {
    paddingHorizontal: 16, // spacing.md
  },
  /** Card internal padding */
  cardPadding: {
    padding: 16, // spacing.md
  },
});
