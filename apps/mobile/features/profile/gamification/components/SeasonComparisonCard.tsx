import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useTranslation } from "react-i18next";
import type { SeasonComparisonData } from "@repo/types";

interface SeasonComparisonCardProps {
  comparison: SeasonComparisonData;
}

interface ComparisonRowProps {
  label: string;
  current: number;
  previous: number | null;
  suffix?: string;
}

function ComparisonRow({
  label,
  current,
  previous,
  suffix = "",
}: ComparisonRowProps) {
  const { theme } = useTheme();

  const diff = previous !== null ? current - previous : null;
  const isPositive = diff !== null && diff > 0;
  const isNegative = diff !== null && diff < 0;

  return (
    <View style={styles.row}>
      <AppText variant="caption" color="secondary" style={styles.rowLabel}>
        {label}
      </AppText>
      <View style={styles.rowValues}>
        <AppText style={styles.currentValue}>
          {current}
          {suffix}
        </AppText>
        {diff !== null && (
          <View style={styles.diffContainer}>
            <Ionicons
              name={
                isPositive ? "arrow-up" : isNegative ? "arrow-down" : "remove"
              }
              size={12}
              color={
                isPositive
                  ? "#22C55E"
                  : isNegative
                    ? "#EF4444"
                    : theme.colors.textSecondary
              }
            />
            <AppText
              variant="caption"
              style={{
                color: isPositive
                  ? "#22C55E"
                  : isNegative
                    ? "#EF4444"
                    : theme.colors.textSecondary,
              }}
            >
              {Math.abs(diff)}
              {suffix}
            </AppText>
          </View>
        )}
      </View>
    </View>
  );
}

export function SeasonComparisonCard({
  comparison,
}: SeasonComparisonCardProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  const { currentSeason, previousSeason } = comparison;

  return (
    <Card>
      <View style={styles.header}>
        <AppText variant="subtitle">
          {t("gamification.seasonComparison")}
        </AppText>
        <AppText variant="caption" color="secondary">
          {currentSeason.name}
          {previousSeason && ` vs ${previousSeason.name}`}
        </AppText>
      </View>

      <View style={styles.content}>
        <ComparisonRow
          label={t("profile.accuracy")}
          current={currentSeason.accuracy}
          previous={previousSeason?.accuracy ?? null}
          suffix="%"
        />
        <View
          style={[styles.separator, { backgroundColor: theme.colors.border }]}
        />
        <ComparisonRow
          label={t("profile.exactShort")}
          current={currentSeason.exactScores}
          previous={previousSeason?.exactScores ?? null}
        />
        <View
          style={[styles.separator, { backgroundColor: theme.colors.border }]}
        />
        <ComparisonRow
          label={t("profile.predictions")}
          current={currentSeason.totalPredictions}
          previous={previousSeason?.totalPredictions ?? null}
        />
        <View
          style={[styles.separator, { backgroundColor: theme.colors.border }]}
        />
        <ComparisonRow
          label={t("gamification.points")}
          current={currentSeason.points}
          previous={previousSeason?.points ?? null}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 16,
  },
  content: {
    gap: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLabel: {
    flex: 1,
  },
  rowValues: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexShrink: 0,
  },
  currentValue: {
    fontSize: 18,
    fontWeight: "600",
    minWidth: 70,
    textAlign: "right",
    flexShrink: 0,
  },
  diffContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    minWidth: 70,
    flexShrink: 0,
  },
  separator: {
    height: 1,
  },
});
