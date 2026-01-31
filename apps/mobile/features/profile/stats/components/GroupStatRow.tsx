// features/profile/stats/components/GroupStatRow.tsx
// Single row: group name, rank pill, points, accuracy%, sparkline.

import React from "react";
import { View, StyleSheet } from "react-native";
import { AppText, Row } from "@/components/ui";
import { SparklineChart } from "./SparklineChart";
import { useTheme } from "@/lib/theme";

interface GroupStatRowProps {
  groupName: string;
  rank: number;
  totalPoints: number;
  accuracy: number;
  recentPoints: number[];
}

export function GroupStatRow({
  groupName,
  rank,
  totalPoints,
  accuracy,
  recentPoints,
}: GroupStatRowProps) {
  const { theme } = useTheme();

  return (
    <Row
      gap={theme.spacing.md}
      style={[styles.row, { paddingVertical: theme.spacing.sm }]}
    >
      <View style={styles.left}>
        <AppText variant="body" numberOfLines={1} style={styles.name}>
          {groupName}
        </AppText>
        <View style={[styles.rankPill, { backgroundColor: theme.colors.border }]}>
          <AppText variant="caption">#{rank}</AppText>
        </View>
      </View>
      <View style={styles.stats}>
        <AppText variant="body" style={styles.points}>
          {totalPoints} pts
        </AppText>
        <AppText variant="caption" color="secondary">
          {accuracy}%
        </AppText>
      </View>
      <SparklineChart data={recentPoints} width={48} height={24} />
    </Row>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    justifyContent: "flex-start",
  },
  left: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: {
    flex: 1,
  },
  rankPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  stats: {
    alignItems: "flex-end",
  },
  points: {
    fontWeight: "600",
  },
});
