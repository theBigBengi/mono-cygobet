// features/groups/group-lobby/components/LobbyGamesSummary.tsx
// Games stats card — stats grid + view games button.

import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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
  onPredictPress?: () => void;
}

function LobbyGamesSummaryInner({
  totalFixtures,
  completedFixturesCount,
  predictionsCount,
  liveGamesCount,
  onPress,
}: LobbyGamesSummaryProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const remaining = totalFixtures - completedFixturesCount;
  const isLive = liveGamesCount > 0;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.surface },
      ]}
    >
      {/* Stats */}
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

      {/* Live indicator */}
      {isLive && (
        <View style={[styles.livePill, { backgroundColor: theme.colors.live + "18" }]}>
          <View style={[styles.liveDot, { backgroundColor: theme.colors.live }]} />
          <Text style={[styles.liveText, { color: theme.colors.live }]}>
            {liveGamesCount} {t("lobby.summaryLive")}
          </Text>
        </View>
      )}

      {/* View Games button */}
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.viewGamesButton,
          pressed && { opacity: 0.7 },
        ]}
      >
        <Text style={styles.viewGamesText}>
          {t("lobby.viewGames").toUpperCase()}
        </Text>
      </Pressable>
    </View>
  );
}

export const LobbyGamesSummary = React.memo(LobbyGamesSummaryInner);

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    container: {
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
      borderRadius: theme.radius.sm,
      padding: theme.spacing.md,
      ...getShadowStyle("md"),
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      marginBottom: theme.spacing.ms,
    },
    statsGrid: {
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    stat: {
      flex: 1,
      alignItems: "center",
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
    livePill: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "center",
      gap: 5,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.full,
      marginTop: theme.spacing.sm,
    },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    liveText: {
      fontSize: 11,
      fontWeight: "700",
    },
    viewGamesButton: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderBottomWidth: 3,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.sm,
      paddingVertical: theme.spacing.ms,
      alignItems: "center",
      marginTop: theme.spacing.ms,
    },
    viewGamesText: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.primary,
    },
  });
