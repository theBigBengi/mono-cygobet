import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useTranslation } from "react-i18next";
import type { StreakData } from "@repo/types";
import { InfoButton } from "./InfoButton";

interface StreakIndicatorProps {
  streak: StreakData;
  onInfoPress?: () => void;
}

export function StreakIndicator({ streak, onInfoPress }: StreakIndicatorProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  const isHot = streak.current >= 3;

  return (
    <Card>
      <View style={[styles.header, { marginBottom: theme.spacing.md }]}>
        <AppText variant="subtitle">{t("gamification.streak")}</AppText>
        <View style={[styles.headerRight, { gap: theme.spacing.sm }]}>
          {isHot && <Ionicons name="flame" size={20} color={theme.colors.accent} />}
          {onInfoPress && <InfoButton onPress={onInfoPress} />}
        </View>
      </View>

      <View style={[styles.statsRow, { gap: theme.spacing.lg, paddingVertical: theme.spacing.xs }]}>
        <View style={styles.statItem}>
          <AppText style={[styles.statValue, isHot && { color: theme.colors.accent }]}>
            {streak.current}
          </AppText>
          <AppText variant="caption" color="secondary">
            {t("gamification.current")}
          </AppText>
        </View>
        <View
          style={[styles.divider, { backgroundColor: theme.colors.border }]}
        />
        <View style={styles.statItem}>
          <AppText style={styles.statValue}>{streak.best}</AppText>
          <AppText variant="caption" color="secondary">
            {t("gamification.best")}
          </AppText>
        </View>
      </View>

      {streak.lastResults.length > 0 && (
        <View style={[styles.resultsRow, { gap: theme.spacing.xs, marginTop: theme.spacing.md }]}>
          {streak.lastResults.map((result, i) => (
            <View
              key={i}
              style={[
                styles.resultDot,
                {
                  borderRadius: theme.radius.full,
                  backgroundColor: result === "hit" ? theme.colors.success : theme.colors.danger,
                },
              ]}
            />
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  statItem: {
    alignItems: "center",
    minWidth: 60,
    flexShrink: 0,
    minHeight: 44,
  },
  statValue: {
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 40,
  },
  divider: {
    width: 1,
    height: 40,
  },
  resultsRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  resultDot: {
    width: 12,
    height: 12,
  },
});
