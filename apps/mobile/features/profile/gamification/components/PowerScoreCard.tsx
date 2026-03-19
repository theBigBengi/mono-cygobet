import React from "react";
import { View, StyleSheet } from "react-native";
import { Card, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useTranslation } from "react-i18next";
import { InfoButton } from "./InfoButton";

interface PowerScoreCardProps {
  score: number;
  onInfoPress?: () => void;
}

function getScoreColor(score: number, colors: { success: string; warning: string; accent: string; danger: string }): string {
  if (score >= 80) return colors.success;
  if (score >= 60) return colors.warning;
  if (score >= 40) return colors.accent;
  return colors.danger;
}

export function PowerScoreCard({ score, onInfoPress }: PowerScoreCardProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const color = getScoreColor(score, { success: theme.colors.success, warning: theme.colors.warning, accent: theme.colors.accent, danger: theme.colors.danger });

  return (
    <Card>
      <View style={[styles.header, { marginBottom: theme.spacing.md }]}>
        <View style={[styles.titleRow, { gap: theme.spacing.sm }]}>
          <AppText variant="subtitle">{t("gamification.powerScore")}</AppText>
          {onInfoPress && <InfoButton onPress={onInfoPress} />}
        </View>
        <View style={[styles.scoreContainer, { gap: theme.spacing.xxs }]}>
          <AppText style={[styles.score, { color }]}>{score}</AppText>
          <AppText variant="caption" color="secondary">
            /100
          </AppText>
        </View>
      </View>

      <View
        style={[styles.progressBar, { backgroundColor: theme.colors.border, borderRadius: theme.radius.xs }]}
      >
        <View
          style={[
            styles.progressFill,
            { width: `${Math.min(score, 100)}%`, backgroundColor: color, borderRadius: theme.radius.xs },
          ]}
        />
      </View>

      <View style={[styles.labels, { marginTop: theme.spacing.sm }]}>
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
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  scoreContainer: {
    flexDirection: "row",
    alignItems: "baseline",
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
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
