// features/groups/group-lobby/components/LobbyGamesSummary.tsx
// Games summary card — progress ring + stats in a clean card.

import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "@/lib/theme";
import { getShadowStyle } from "@/lib/theme/shadows";

const RING_SIZE = 56;
const RING_STROKE = 5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

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
    totalFixtures > 0 ? completedFixturesCount / totalFixtures : 0;
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - progressPct);

  // Status config
  let statusIcon: React.ComponentProps<typeof Ionicons>["name"] = "checkmark-circle";
  let statusColor = theme.colors.success;
  let statusText = t("lobby.summaryAllSet");

  if (liveGamesCount > 0) {
    statusIcon = "radio";
    statusColor = theme.colors.live;
    statusText = `${liveGamesCount} ${t("lobby.summaryLive")}`;
  } else if (unpredictedCount > 0) {
    statusIcon = "alert-circle";
    statusColor = theme.colors.warning;
    statusText = t("lobby.summaryNeedPredictionCount", { count: unpredictedCount });
  } else if (predictableCount === 0) {
    statusIcon = "time-outline";
    statusColor = theme.colors.textSecondary;
    statusText = t("lobby.summaryRemaining");
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: theme.colors.surface },
        pressed && { opacity: 0.7 },
      ]}
    >
      {/* Left: Progress ring */}
      <View style={styles.ringSection}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          {/* Track */}
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={theme.colors.border}
            strokeWidth={RING_STROKE}
            fill="none"
          />
          {/* Fill */}
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={theme.colors.primary}
            strokeWidth={RING_STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            rotation={-90}
            origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
          />
        </Svg>
        <View style={styles.ringLabel}>
          <Text style={[styles.ringValue, { color: theme.colors.textPrimary }]}>
            {Math.round(progressPct * 100)}
          </Text>
          <Text style={[styles.ringUnit, { color: theme.colors.textSecondary }]}>%</Text>
        </View>
      </View>

      {/* Right: Stats */}
      <View style={styles.statsSection}>
        <View style={styles.statsGrid}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
              {completedFixturesCount}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              {t("lobby.summaryCompleted")}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
              {remaining}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              {t("lobby.summaryRemaining")}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
              {predictionsCount}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              {t("lobby.summaryPredicted")}
            </Text>
          </View>
        </View>

        {/* Status pill */}
        <View style={[styles.statusPill, { backgroundColor: statusColor + "14" }]}>
          <Ionicons name={statusIcon} size={13} color={statusColor} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusText}
          </Text>
        </View>
      </View>

    </Pressable>
  );
}

export const LobbyGamesSummary = React.memo(LobbyGamesSummaryInner);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 18,
    padding: 16,
    ...getShadowStyle("sm"),
  },
  ringSection: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginEnd: 16,
  },
  ringLabel: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  ringValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  ringUnit: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  statsSection: {
    flex: 1,
    gap: 10,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 4,
  },
  stat: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 1,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
