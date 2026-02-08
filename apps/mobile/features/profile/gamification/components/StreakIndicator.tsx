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
      <View style={styles.header}>
        <AppText variant="subtitle">{t("gamification.streak")}</AppText>
        <View style={styles.headerRight}>
          {isHot && <Ionicons name="flame" size={20} color="#F97316" />}
          {onInfoPress && <InfoButton onPress={onInfoPress} />}
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <AppText style={[styles.statValue, isHot && { color: "#F97316" }]}>
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
        <View style={styles.resultsRow}>
          {streak.lastResults.map((result, i) => (
            <View
              key={i}
              style={[
                styles.resultDot,
                {
                  backgroundColor: result === "hit" ? "#22C55E" : "#EF4444",
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
    marginBottom: 16,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    paddingVertical: 4,
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
    gap: 6,
    marginTop: 16,
  },
  resultDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
