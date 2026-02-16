// features/groups/predictions/components/FixtureGroupSection.tsx
// Section header for fixture groups - supports different display modes.

import React from "react";
import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { FixtureGroup } from "../hooks/useGroupedFixtures";

interface FixtureGroupSectionProps {
  group: FixtureGroup;
  children: React.ReactNode;
}

/**
 * Section wrapper for fixture groups.
 * Adapts header display based on group type:
 * - LIVE: Shows "LIVE" badge
 * - Round-based (leagues mode all/live/results): Shows round number
 * - No header for flat list (leagues mode single round)
 * - League-based (teams/games mode): Shows league name and country
 */
export function FixtureGroupSection({
  group,
  children,
}: FixtureGroupSectionProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  // No headers - all info now shown in cards
  const renderHeader = () => {
    return null;
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
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "transparent",
  },
  dateHeader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: "transparent",
  },
  dateText: {
    fontSize: 14,
    fontWeight: "600",
  },
  leagueName: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  roundText: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  liveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
