// features/profile/head-to-head/components/SharedGroupRow.tsx
// Single shared group with both ranks/points.

import React from "react";
import { View, StyleSheet } from "react-native";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { ApiHeadToHeadSharedGroup } from "@repo/types";

interface SharedGroupRowProps {
  group: ApiHeadToHeadSharedGroup;
  userLabel: string;
  opponentLabel: string;
}

export function SharedGroupRow({
  group,
  userLabel,
  opponentLabel,
}: SharedGroupRowProps) {
  const { theme } = useTheme();
  const userWon = group.userPoints > group.opponentPoints;
  const opponentWon = group.opponentPoints > group.userPoints;

  return (
    <View style={[styles.row, { paddingVertical: theme.spacing.sm }]}>
      <View style={styles.side}>
        <AppText variant="body" style={userWon ? styles.winner : undefined}>
          {group.userPoints} pts
        </AppText>
        <AppText variant="caption" color="secondary">
          #{group.userRank} · {userLabel}
        </AppText>
      </View>
      <AppText
        variant="caption"
        color="secondary"
        numberOfLines={2}
        style={styles.groupName}
      >
        {group.groupName}
      </AppText>
      <View style={[styles.side, { alignItems: "flex-end" }]}>
        <AppText variant="body" style={opponentWon ? styles.winner : undefined}>
          {group.opponentPoints} pts
        </AppText>
        <AppText variant="caption" color="secondary">
          #{group.opponentRank} · {opponentLabel}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  side: {
    flex: 1,
    alignItems: "flex-start",
  },
  groupName: {
    flex: 0,
    marginHorizontal: 12,
    maxWidth: 120,
    textAlign: "center",
  },
  winner: {
    fontWeight: "700",
  },
});
