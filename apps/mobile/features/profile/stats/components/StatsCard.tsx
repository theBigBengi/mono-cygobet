// features/profile/stats/components/StatsCard.tsx
// 4-stat card: accuracy, predictions, exact, correct.

import React from "react";
import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { Card, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";

interface StatsCardProps {
  accuracy: number;
  totalPredictions: number;
  exactPredictions: number;
  correctPredictions: number;
}

export function StatsCard({
  accuracy,
  totalPredictions,
  exactPredictions,
  correctPredictions,
}: StatsCardProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  const stats = [
    {
      value: accuracy > 0 ? `${accuracy}%` : "—",
      label: t("profile.accuracy"),
    },
    {
      value: totalPredictions > 0 ? totalPredictions.toLocaleString() : "—",
      label: t("profile.predictions"),
    },
    {
      value: totalPredictions > 0 ? exactPredictions : "—",
      label: t("profile.exactShort"),
    },
    {
      value: totalPredictions > 0 ? correctPredictions : "—",
      label: t("profile.correctShort"),
    },
  ];

  return (
    <Card>
      <View style={styles.statsRow}>
        {stats.map(({ value, label }) => (
          <View key={label} style={styles.statBox}>
            <AppText
              style={[styles.statValue, { color: theme.colors.textPrimary }]}
            >
              {value}
            </AppText>
            <AppText
              variant="caption"
              color="secondary"
              style={styles.statLabel}
            >
              {label}
            </AppText>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 28,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
});
