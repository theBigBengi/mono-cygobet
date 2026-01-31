// features/profile/stats/components/OverallStatsCard.tsx
// 2x2 grid: Total Points, Accuracy%, Exact Scores, Groups.

import React from "react";
import { View, StyleSheet } from "react-native";
import { Card, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";

interface OverallStatsCardProps {
  totalPoints: number;
  accuracy: number;
  exactScores: number;
  groupsPlayed: number;
}

function StatBox({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  const { theme } = useTheme();
  return (
    <View style={[styles.box, { padding: theme.spacing.md }]}>
      <AppText variant="caption" color="secondary">
        {label}
      </AppText>
      <AppText variant="title" style={styles.value}>
        {value}
      </AppText>
    </View>
  );
}

export function OverallStatsCard({
  totalPoints,
  accuracy,
  exactScores,
  groupsPlayed,
}: OverallStatsCardProps) {
  return (
    <Card>
      <AppText variant="subtitle" style={styles.title}>
        Overall
      </AppText>
      <View style={styles.grid}>
        <StatBox label="Total Points" value={totalPoints} />
        <StatBox label="Accuracy" value={`${accuracy}%`} />
        <StatBox label="Exact Scores" value={exactScores} />
        <StatBox label="Groups" value={groupsPlayed} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -8,
  },
  box: {
    width: "50%",
    alignItems: "center",
    marginBottom: 8,
  },
  value: {
    marginTop: 4,
  },
});
