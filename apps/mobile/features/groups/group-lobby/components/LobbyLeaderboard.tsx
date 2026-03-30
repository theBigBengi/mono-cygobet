// features/groups/group-lobby/components/LobbyLeaderboard.tsx
// Leaderboard card — title centered, bars with border, user row blue, view button.

import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme, spacing, radius } from "@/lib/theme";
import type { ApiRankingItem } from "@repo/types";

export interface LobbyLeaderboardProps {
  ranking: ApiRankingItem[] | undefined;
  currentUserId: number | null;
  isLoading: boolean;
  onPress: () => void;
  memberCount?: number;
}

function LobbyLeaderboardInner({
  ranking,
  currentUserId,
  isLoading,
  onPress,
  memberCount,
}: LobbyLeaderboardProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const allRanking = ranking ?? [];
  const top3 = allRanking.slice(0, 3);
  const skeletonOpacity = useSharedValue(0.3);

  useEffect(() => {
    if (isLoading) {
      skeletonOpacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
    }
  }, [isLoading, skeletonOpacity]);

  const skeletonStyle = useAnimatedStyle(() => ({ opacity: skeletonOpacity.value }));

  // Bar entrance animations
  const bar0 = useSharedValue(0);
  const bar1 = useSharedValue(0);
  const bar2 = useSharedValue(0);
  const bar3 = useSharedValue(0);
  const fade = useSharedValue(0);
  const barEasing = Easing.out(Easing.cubic);

  useEffect(() => {
    const hasData = !isLoading && top3.length > 0 && !allRanking.every((r) => r.totalPoints === 0);
    if (!hasData) { bar0.value = 0; bar1.value = 0; bar2.value = 0; bar3.value = 0; fade.value = 0; return; }
    bar0.value = 0; bar1.value = 0; bar2.value = 0; bar3.value = 0; fade.value = 0;
    bar0.value = withDelay(100, withTiming(1, { duration: 500, easing: barEasing }));
    bar1.value = withDelay(250, withTiming(1, { duration: 500, easing: barEasing }));
    bar2.value = withDelay(400, withTiming(1, { duration: 500, easing: barEasing }));
    bar3.value = withDelay(550, withTiming(1, { duration: 500, easing: barEasing }));
    fade.value = withDelay(900, withTiming(1, { duration: 300 }));
  }, [ranking]);

  const bar0Style = useAnimatedStyle(() => ({ opacity: bar0.value }));
  const bar1Style = useAnimatedStyle(() => ({ opacity: bar1.value }));
  const bar2Style = useAnimatedStyle(() => ({ opacity: bar2.value }));
  const bar3Style = useAnimatedStyle(() => ({ opacity: bar3.value }));
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const barStyles = [bar0Style, bar1Style, bar2Style];

  const userRow = currentUserId ? allRanking.find((r) => r.userId === currentUserId) : null;
  const userInTop3 = userRow ? userRow.rank <= 3 : false;
  const maxPoints = top3.length > 0 ? Math.max(...top3.map((r) => r.totalPoints), 1) : 1;
  const allZero = top3.length > 0 && allRanking.every((r) => r.totalPoints === 0);
  const noData = top3.length === 0 || allZero;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={[styles.wrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Animated.View style={[{ width: 100, height: 14, borderRadius: 6, backgroundColor: theme.colors.border, alignSelf: "center" }, skeletonStyle]} />
          <View style={{ marginTop: 16, gap: 10 }}>
            {[1, 2, 3].map((_, i) => (
              <Animated.View key={i} style={[{ height: 40, borderRadius: 8, backgroundColor: theme.colors.border }, skeletonStyle]} />
            ))}
          </View>
        </View>
      </View>
    );
  }

  if (noData) {
    return (
      <View style={styles.container}>
        <View style={[styles.wrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            {t("lobby.leaderboard")}
          </Text>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            {allZero ? t("lobby.rankingNoPointsYet") : t("lobby.rankingPending")}
          </Text>
        </View>
      </View>
    );
  }

  const renderBar = (item: ApiRankingItem, index: number, isUser: boolean) => {
    const isMe = isUser || (currentUserId != null && item.userId === currentUserId);
    const name = isMe ? t("lobby.you") : (item.username ?? `#${item.rank}`);
    const barWidth = `${Math.max((item.totalPoints / maxPoints) * 100, 30)}%`;
    const color = isMe ? theme.colors.primary : theme.colors.textPrimary;
    const barBg = isMe ? theme.colors.primary + "15" : theme.colors.textPrimary + "10";
    const anim = isUser ? bar3Style : barStyles[index];

    return (
      <Animated.View key={item.userId} style={[styles.barRow, anim]}>
        <View style={[styles.barRankCircle, { backgroundColor: color }]}>
          <Text style={[styles.barRankText, { color: theme.colors.textInverse }]}>{item.rank}</Text>
        </View>
        <View style={[styles.barContent, { borderColor: isMe ? theme.colors.primary : theme.colors.border }]}>
          <Animated.View style={[styles.barFill, { width: barWidth, backgroundColor: barBg }, anim]} />
          <Animated.View style={[styles.barLabels, fadeStyle]}>
            <Text style={[styles.barName, { color }, isMe && { fontWeight: "800" }]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[styles.barPoints, { color }]}>
              {item.totalPoints}
              <Text style={{ color: isMe ? color : theme.colors.textSecondary, fontSize: 10 }}> pts</Text>
            </Text>
          </Animated.View>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.wrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        {/* Title centered with border */}
        <View style={[styles.titleRow, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            {t("lobby.leaderboard")}
          </Text>
        </View>

        {/* Bars */}
        <View style={styles.barsContainer}>
          {top3.map((item, i) => renderBar(item, i, false))}
          {userRow && !userInTop3 && renderBar(userRow, 3, true)}
        </View>

        {/* View Ranking button */}
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
          style={({ pressed }) => [
            styles.viewButton,
            { borderColor: theme.colors.border },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={[styles.viewButtonText, { color: theme.colors.primary }]}>
            {t("lobby.viewAll").toUpperCase()}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export const LobbyLeaderboard = React.memo(LobbyLeaderboardInner);

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  wrapper: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderBottomWidth: 3,
    padding: spacing.md,
  },

  // Title
  titleRow: {
    alignItems: "center",
    paddingBottom: spacing.ms,
    marginBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    marginTop: spacing.sm,
  },

  // Bars
  barsContainer: {
    gap: spacing.ms,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  barRankCircle: {
    width: 26,
    height: 26,
    borderRadius: radius.s,
    alignItems: "center",
    justifyContent: "center",
  },
  barRankText: {
    fontSize: 12,
    fontWeight: "800",
  },
  barContent: {
    flex: 1,
    height: 40,
    justifyContent: "center",
    position: "relative",
    borderWidth: 1,
    borderBottomWidth: 2,
    borderRadius: radius.s,
    overflow: "hidden",
  },
  barFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: radius.s,
  },
  barLabels: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.ms,
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  barName: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  barPoints: {
    fontSize: 14,
    fontWeight: "800",
  },

  // Button
  viewButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderBottomWidth: 3,
    borderRadius: radius.sm,
    paddingVertical: spacing.ms,
    alignItems: "center",
    marginTop: spacing.md,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
