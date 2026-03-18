// features/groups/group-lobby/components/LobbyGamesSummary.tsx
// Flat, minimal games overview — all key stats at a glance.

import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme";
import { getShadowStyle } from "@/lib/theme/shadows";

export interface LobbyGamesSummaryProps {
  totalFixtures: number;
  completedFixturesCount: number;
  predictionsCount: number;
  unpredictedCount: number;
  predictableCount: number;
  liveGamesCount: number;
  onPress: () => void;
}

function LobbyGamesSummaryInner({
  totalFixtures,
  completedFixturesCount,
  predictionsCount,
  unpredictedCount,
  predictableCount,
  liveGamesCount,
  onPress,
}: LobbyGamesSummaryProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  const remaining = totalFixtures - completedFixturesCount;
  const progressPct =
    totalFixtures > 0
      ? Math.round((completedFixturesCount / totalFixtures) * 100)
      : 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed && { opacity: 0.7 }]}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            {t("lobby.gamesSummary")}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={theme.colors.textSecondary}
          />
        </View>

        {/* Progress bar */}
        <View
          style={[
            styles.progressTrack,
            { backgroundColor: theme.colors.border },
          ]}
        >
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: theme.colors.primary,
                width: `${Math.min(progressPct, 100)}%`,
              },
            ]}
          />
        </View>

        {/* Stats — single row, evenly spaced */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text
              style={[styles.statValue, { color: theme.colors.textPrimary }]}
            >
              {completedFixturesCount}/{totalFixtures}
            </Text>
            <Text
              style={[
                styles.statLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              {t("lobby.summaryCompleted")}
            </Text>
          </View>

          <View
            style={[styles.statDivider, { backgroundColor: theme.colors.border }]}
          />

          <View style={styles.stat}>
            <Text
              style={[styles.statValue, { color: theme.colors.textPrimary }]}
            >
              {remaining}
            </Text>
            <Text
              style={[
                styles.statLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              {t("lobby.summaryRemaining")}
            </Text>
          </View>

          <View
            style={[styles.statDivider, { backgroundColor: theme.colors.border }]}
          />

          <View style={styles.stat}>
            <Text
              style={[styles.statValue, { color: theme.colors.textPrimary }]}
            >
              {predictionsCount}/{totalFixtures}
            </Text>
            <Text
              style={[
                styles.statLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              {t("lobby.summaryPredicted")}
            </Text>
          </View>
        </View>

        {/* Status line — contextual */}
        {liveGamesCount > 0 ? (
          <View style={styles.statusRow}>
            <Ionicons name="radio" size={12} color={theme.colors.live} />
            <Text style={[styles.statusText, { color: theme.colors.live }]}>
              {liveGamesCount} {t("lobby.summaryLive")}
            </Text>
          </View>
        ) : unpredictedCount > 0 ? (
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: theme.colors.warning },
              ]}
            />
            <Text style={[styles.statusText, { color: theme.colors.warning }]}>
              {t("lobby.summaryNeedPredictionCount", {
                count: unpredictedCount,
              })}
            </Text>
          </View>
        ) : predictableCount > 0 ? (
          <View style={styles.statusRow}>
            <Ionicons
              name="checkmark-circle"
              size={13}
              color={theme.colors.success}
            />
            <Text style={[styles.statusText, { color: theme.colors.success }]}>
              {t("lobby.summaryAllSet")}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export const LobbyGamesSummary = React.memo(LobbyGamesSummaryInner);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
  },
  progressTrack: {
    height: 4,
    borderRadius: 3,
    marginBottom: 18,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    borderRadius: 3,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
  },
  statValue: {
    fontSize: 17,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
