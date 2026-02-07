import React from "react";
import { View, StyleSheet } from "react-native";
import { Card, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useTranslation } from "react-i18next";

interface PowerScoreCardProps {
  score: number;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#22C55E";
  if (score >= 60) return "#EAB308";
  if (score >= 40) return "#F97316";
  return "#EF4444";
}

export function PowerScoreCard({ score }: PowerScoreCardProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const color = getScoreColor(score);

  return (
    <Card>
      <View style={styles.header}>
        <AppText variant="subtitle">{t("gamification.powerScore")}</AppText>
        <View style={styles.scoreContainer}>
          <AppText style={[styles.score, { color }]}>{score}</AppText>
          <AppText variant="caption" color="secondary">
            /100
          </AppText>
        </View>
      </View>

      <View
        style={[styles.progressBar, { backgroundColor: theme.colors.border }]}
      >
        <View
          style={[
            styles.progressFill,
            { width: `${score}%`, backgroundColor: color },
          ]}
        />
      </View>

      <View style={styles.labels}>
        <AppText variant="caption" color="secondary">
          0
        </AppText>
        <AppText variant="caption" color="secondary">
          50
        </AppText>
        <AppText variant="caption" color="secondary">
          100
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  scoreContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
    flexShrink: 0,
    minWidth: 70,
    minHeight: 44,
  },
  score: {
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 40,
  },
  progressBar: {
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 6,
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
});
