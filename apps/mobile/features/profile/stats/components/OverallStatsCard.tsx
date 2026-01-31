// features/profile/stats/components/OverallStatsCard.tsx
// 2x2 grid: Total Points, Accuracy%, Exact Scores, Groups.

import React from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("common");
  return (
    <Card>
      <AppText variant="subtitle" style={styles.title}>
        {t("profile.overall")}
      </AppText>
      <View style={styles.grid}>
        <StatBox label={t("predictions.totalPoints")} value={totalPoints} />
        <StatBox label={t("profile.accuracy")} value={`${accuracy}%`} />
        <StatBox label={t("predictions.exactScores")} value={exactScores} />
        <StatBox label={t("predictions.groups")} value={groupsPlayed} />
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
