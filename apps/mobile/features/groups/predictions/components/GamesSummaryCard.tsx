import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme, spacing, radius } from "@/lib/theme";
import { getShadowStyle } from "@/lib/theme/shadows";

type Props = {
  totalPoints: number;
  predictedCount: number;
  totalCount: number;
  accuracy: number;
};

export function GamesSummaryCard({
  totalPoints,
  predictedCount,
  totalCount,
  accuracy,
}: Props) {
  const { theme } = useTheme();

  const accuracyColor =
    accuracy >= 60
      ? theme.colors.success
      : accuracy >= 30
        ? theme.colors.warning
        : theme.colors.textSecondary;

  const progressRatio = totalCount > 0 ? predictedCount / totalCount : 0;

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        {/* Points pill */}
        <View style={[styles.pill, { backgroundColor: theme.colors.primary + "12" }]}>
          <Text style={[styles.pillValue, { color: theme.colors.primary }]}>
            {totalPoints}
          </Text>
          <Text style={[styles.pillLabel, { color: theme.colors.primary + "90" }]}>
            PTS
          </Text>
        </View>

        {/* Progress pill */}
        <View style={[styles.pill, styles.progressPill, { backgroundColor: theme.colors.textSecondary + "10" }]}>
          <View style={styles.progressTop}>
            <MaterialCommunityIcons
              name="checkbox-marked-circle-outline"
              size={13}
              color={theme.colors.textSecondary}
              style={styles.progressIcon}
            />
            <Text style={[styles.pillValue, { color: theme.colors.textPrimary }]}>
              {predictedCount}
              <Text style={{ color: theme.colors.textSecondary, fontWeight: "600", fontSize: 13 }}>
                /{totalCount}
              </Text>
            </Text>
          </View>
          {/* Mini progress bar */}
          <View style={[styles.progressBarBg, { backgroundColor: theme.colors.textSecondary + "20" }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: progressRatio >= 1 ? theme.colors.success : theme.colors.primary,
                  width: `${Math.min(progressRatio * 100, 100)}%`,
                },
              ]}
            />
          </View>
        </View>

        {/* Accuracy pill */}
        <View style={[styles.pill, { backgroundColor: accuracyColor + "12" }]}>
          <Text style={[styles.pillValue, { color: accuracyColor }]}>
            {accuracy}%
          </Text>
          <Text style={[styles.pillLabel, { color: accuracyColor + "90" }]}>
            ACC
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: spacing.ms,
    marginBottom: spacing.ms,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  pill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: radius.sm,
    borderRadius: radius.lg,
    gap: spacing.xxs,
    ...getShadowStyle("sm"),
  },
  progressPill: {
    paddingVertical: spacing.sm,
    paddingHorizontal: radius.sm,
    gap: radius.xs,
  },
  pillValue: {
    fontSize: 17,
    fontWeight: "800",
  },
  pillLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  progressTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  progressIcon: {
    marginTop: 1,
  },
  progressBarBg: {
    width: "100%",
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2,
  },
});
