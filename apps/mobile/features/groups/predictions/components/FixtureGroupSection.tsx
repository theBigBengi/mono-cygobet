// features/groups/predictions/components/FixtureGroupSection.tsx
// Section header for fixture groups - supports different display modes.

import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/lib/theme";
import type { FixtureGroup } from "../hooks/useGroupedFixtures";

interface FixtureGroupSectionProps {
  group: FixtureGroup;
  children: React.ReactNode;
  /** Hide section header (e.g., when there's only one group) */
  hideHeader?: boolean;
}

/**
 * Section wrapper for fixture groups.
 * Different visual styles per group type:
 * - LIVE: red badge with pulsing dot
 * - Date: subtle centered text, no lines
 * - League: left-aligned text with fading line to the right
 */
export function FixtureGroupSection({
  group,
  children,
  hideHeader = false,
}: FixtureGroupSectionProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  const renderHeader = () => {
    if (hideHeader || !group.label) return null;

    // LIVE badge
    if (group.isLive) {
      return (
        <View style={styles.liveHeader}>
          <View
            style={[
              styles.liveBadge,
              { backgroundColor: theme.colors.danger + "15" },
            ]}
          >
            <View
              style={[
                styles.liveDot,
                { backgroundColor: theme.colors.danger },
              ]}
            />
            <Text style={[styles.liveText, { color: theme.colors.danger }]}>
              LIVE
            </Text>
          </View>
        </View>
      );
    }

    // Date group — centered, minimal
    if (group.level === "date" || group.dateLabel) {
      return (
        <View style={styles.dateHeader}>
          <Text
            style={[styles.dateText, { color: theme.colors.textSecondary }]}
          >
            {group.dateLabel || group.label}
          </Text>
        </View>
      );
    }

    // League/default — left-aligned with trailing line
    return (
      <View style={styles.leagueHeader}>
        <Text
          style={[styles.leagueText, { color: theme.colors.textSecondary }]}
          numberOfLines={1}
        >
          {group.label}
        </Text>
        <View
          style={[styles.trailingLine, { backgroundColor: theme.colors.border }]}
        />
      </View>
    );
  };

  return (
    <View style={styles.section}>
      {renderHeader()}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 0,
  },
  // LIVE
  liveHeader: {
    alignItems: "center",
    paddingVertical: 8,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  // Date — centered, no lines
  dateHeader: {
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 36,
  },
  dateText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  // League — left-aligned with trailing line
  leagueHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingLeft: 44,
    paddingRight: 36,
    gap: 10,
  },
  leagueText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  trailingLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
});
