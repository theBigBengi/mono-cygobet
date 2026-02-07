// features/profile/stats/components/PredictionsStatsCard.tsx
// 3-column grid: Accuracy%, Correct predictions, Exact scores.

import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet } from "react-native";
import { Card, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";

interface PredictionsStatsCardProps {
  accuracy: number;
  correctPredictions: number;
  exactScores: number;
}

function StatBox({ label, value }: { label: string; value: string | number }) {
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

export function PredictionsStatsCard({
  accuracy,
  correctPredictions,
  exactScores,
}: PredictionsStatsCardProps) {
  const { t } = useTranslation("common");
  return (
    <Card>
      <AppText variant="subtitle" style={styles.title}>
        {t("profile.predictions")}
      </AppText>
      <View style={styles.grid}>
        <StatBox label={t("profile.accuracy")} value={`${accuracy}%`} />
        <StatBox
          label={t("profile.correctPredictions")}
          value={correctPredictions}
        />
        <StatBox label={t("predictions.exactScores")} value={exactScores} />
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
    width: "33.33%",
    alignItems: "center",
    marginBottom: 8,
  },
  value: {
    marginTop: 4,
  },
});
