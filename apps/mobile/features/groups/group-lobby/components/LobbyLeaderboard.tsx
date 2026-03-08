// features/groups/group-lobby/components/LobbyLeaderboard.tsx
// Podium-style leaderboard with cards for top 3 players.

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
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { getInitials } from "@/utils/string";
import type { ApiRankingItem } from "@repo/types";

// Podium colors are now provided by theme.colors.gold/silver/bronze
const RANK_COLORS = ["#FFD700", "#8E9AAF", "#C4956A"] as const; // Legacy fallback
const PODIUM_HEIGHTS = [36, 36, 36] as const; // unused — kept for skeleton

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
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    if (isLoading) {
      opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
    }
  }, [isLoading, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // ── Entrance animation for podium bars ──
  const bar0Progress = useSharedValue(0); // 1st place
  const bar1Progress = useSharedValue(0); // 2nd place
  const bar2Progress = useSharedValue(0); // 3rd place
  const bar3Progress = useSharedValue(0); // user (if not in top 3)
  const contentFade = useSharedValue(0);

  const barEasing = Easing.out(Easing.cubic);

  useEffect(() => {
    const hasData = !isLoading && top3.length > 0 && !allRanking.every((r) => r.totalPoints === 0);
    if (!hasData) {
      bar0Progress.value = 0;
      bar1Progress.value = 0;
      bar2Progress.value = 0;
      bar3Progress.value = 0;
      contentFade.value = 0;
      return;
    }
    bar0Progress.value = 0;
    bar1Progress.value = 0;
    bar2Progress.value = 0;
    bar3Progress.value = 0;
    contentFade.value = 0;

    bar0Progress.value = withDelay(100, withTiming(1, { duration: 500, easing: barEasing }));
    bar1Progress.value = withDelay(250, withTiming(1, { duration: 500, easing: barEasing }));
    bar2Progress.value = withDelay(400, withTiming(1, { duration: 500, easing: barEasing }));
    bar3Progress.value = withDelay(550, withTiming(1, { duration: 500, easing: barEasing }));
    contentFade.value = withDelay(900, withTiming(1, { duration: 300 }));
  }, [ranking]);

  // Animated styles — must be called unconditionally (before early returns)
  const bar0Style = useAnimatedStyle(() => ({ opacity: bar0Progress.value }));
  const bar1Style = useAnimatedStyle(() => ({ opacity: bar1Progress.value }));
  const bar2Style = useAnimatedStyle(() => ({ opacity: bar2Progress.value }));
  const bar3Style = useAnimatedStyle(() => ({ opacity: bar3Progress.value }));
  const contentFadeStyle = useAnimatedStyle(() => ({ opacity: contentFade.value }));
  const barStyles = [bar0Style, bar1Style, bar2Style];

  // Find current user's row
  const userRow = currentUserId
    ? allRanking.find((r) => r.userId === currentUserId)
    : null;
  const userInTop3 = userRow ? userRow.rank <= 3 : false;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.wrapper}>
          {/* Title skeleton */}
          <Animated.View
            style={[
              { width: 100, height: 14, borderRadius: 6, backgroundColor: theme.colors.border },
              animatedStyle,
            ]}
          />
          {/* Bar rows skeleton */}
          <View style={{ marginTop: 12, gap: 8 }}>
            {[200, 150, 100].map((w, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Animated.View
                  style={[
                    { width: 22, height: 22, borderRadius: 11, backgroundColor: theme.colors.border },
                    animatedStyle,
                  ]}
                />
                <Animated.View
                  style={[
                    { width: w, height: 36, borderRadius: 8, backgroundColor: theme.colors.border },
                    animatedStyle,
                  ]}
                />
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  // Shared "no ranking yet" renderer for both empty and all-zero states
  const allZeroPoints = top3.length > 0 && allRanking.every((r) => r.totalPoints === 0);
  if (top3.length === 0 || allZeroPoints) {
    const message = allZeroPoints
      ? t("lobby.rankingNoPointsYet")
      : t("lobby.rankingPending");
    const members = allZeroPoints ? allRanking : [];
  
    return (
      <View style={styles.container}>
        <View
          style={[
            styles.wrapper,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          {/* Bottom section */}
          <View style={styles.bottomSection}>
            <View style={styles.bottomRow}>
              {/* Left: title + member count + status message */}
              <View style={styles.bottomLeft}>
                <Text style={[styles.bottomTitle, { color: theme.colors.textPrimary }]}>
                  {t("lobby.leaderboard")}
                </Text>
<Text style={[styles.bottomSubtitle, { color: theme.colors.textSecondary, marginTop: 10 }]}>
                  {message}
                </Text>
              </View>

              {/* Right: View All button (only in zero-points state) */}
              {allZeroPoints && <Pressable
                onPress={onPress}
                style={({ pressed }) => [
                  styles.bottomButton,
                  { borderColor: theme.colors.textSecondary + "40" },
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Text style={[styles.bottomButtonText, { color: theme.colors.textSecondary }]}>
                  {t("lobby.viewAll")}
                </Text>
              </Pressable>}
            </View>
          </View>
        </View>
      </View>
    );
  }

  // Ordered 1st, 2nd, 3rd for horizontal layout
  const maxPoints = top3.length > 0 ? Math.max(...top3.map((r) => r.totalPoints), 1) : 1;

  const renderHorizontalBar = (item: ApiRankingItem, index: number) => {
    const isCurrentUser = currentUserId != null && item.userId === currentUserId;
    const displayName = isCurrentUser ? t("lobby.you") : (item.username ?? `#${item.rank}`);
    const barWidth = `${Math.max((item.totalPoints / maxPoints) * 100, 30)}%`;

    return (
      <View key={item.userId} style={styles.barRow}>
        <View style={[styles.barRankCircle, { backgroundColor: theme.colors.textPrimary }]}>
          <Text style={[styles.barRankText, { color: theme.colors.textInverse }]}>{item.rank}</Text>
        </View>
        <View style={styles.barContent}>
          <Animated.View
            style={[
              styles.bar,
              {
                width: barWidth,
                backgroundColor: theme.colors.textPrimary + "10",
              },
              barStyles[index],
            ]}
          >
            <Animated.View style={[styles.barPointsContainer, contentFadeStyle]}>
              <Text style={[styles.barPoints, { color: theme.colors.textPrimary }]}>
                {item.totalPoints}
                <Text style={{ color: theme.colors.textSecondary, fontSize: 10 }}> pts</Text>
              </Text>
            </Animated.View>
          </Animated.View>
          <Animated.View style={[styles.barNameOverlay, contentFadeStyle]}>
            <Text
              style={[
                styles.barName,
                { color: theme.colors.textPrimary },
                isCurrentUser && { fontWeight: "800" },
              ]}
              numberOfLines={1}
            >
              {displayName}
            </Text>
          </Animated.View>
        </View>
      </View>
    );
  };

  return (
    <Pressable
      style={styles.container}
      onPress={onPress}
    >
      {({ pressed }) => (
      <View
        style={[
          styles.wrapper,
          pressed && styles.wrapperPressed,
        ]}
      >
        {/* Title + nav */}
        <View style={styles.titleRow}>
          <Text style={[styles.bottomTitle, { color: theme.colors.textPrimary }]}>
            {t("lobby.leaderboard")}
          </Text>
          <Pressable onPress={onPress} style={({ pressed: p }) => [p && { opacity: 0.6 }]}>
            <Text style={[styles.seeAllText, { color: theme.colors.textSecondary }]}>
              {t("lobby.viewAll")}
            </Text>
          </Pressable>
        </View>

        {/* Horizontal bars */}
        <View style={styles.barsContainer}>
          {top3.map((item, index) => renderHorizontalBar(item, index))}

          {/* User's position if not in top 3 */}
          {userRow && !userInTop3 && (
            <Animated.View style={[styles.barRow, bar3Style]}>
              <View style={[styles.barRankCircle, { backgroundColor: theme.colors.textPrimary }]}>
                <Text style={styles.barRankText}>{userRow.rank}</Text>
              </View>
              <View style={styles.barContent}>
                <Animated.View
                  style={[
                    styles.bar,
                    {
                      width: `${Math.max((userRow.totalPoints / maxPoints) * 100, 30)}%`,
                      backgroundColor: theme.colors.textPrimary + "10",
                    },
                    bar3Style,
                  ]}
                >
                  <Animated.View style={[styles.barPointsContainer, contentFadeStyle]}>
                    <Text style={[styles.barPoints, { color: theme.colors.textPrimary }]}>
                      {userRow.totalPoints}
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 10 }}> pts</Text>
                    </Text>
                  </Animated.View>
                </Animated.View>
                <Animated.View style={[styles.barNameOverlay, contentFadeStyle]}>
                  <Text
                    style={[styles.barName, { color: theme.colors.textPrimary, fontWeight: "800" }]}
                    numberOfLines={1}
                  >
                    {t("lobby.you")}
                  </Text>
                </Animated.View>
              </View>
            </Animated.View>
          )}
        </View>

      </View>
      )}
    </Pressable>
  );
}

export const LobbyLeaderboard = React.memo(LobbyLeaderboardInner);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  wrapper: {
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: "500",
  },
  wrapperPressed: {
    opacity: 0.7,
  },
  barsContainer: {
    marginTop: 12,
    gap: 8,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  barRankCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  barRankText: {
    fontSize: 11,
    fontWeight: "800",
  },
  barContent: {
    flex: 1,
    position: "relative",
    height: 36,
    justifyContent: "center",
  },
  bar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  barPointsContainer: {
    marginLeft: "auto",
  },
  barNameOverlay: {
    position: "absolute",
    left: 10,
    right: 10,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  barName: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  barPoints: {
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 8,
  },
  memberCountRow: {
    alignItems: "center",
    marginBottom: 8,
  },
  memberCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  memberCountText: {
    fontSize: 12,
    fontWeight: "600",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  emptyText: {
    marginTop: 4,
  },
  podiumSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 0,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  podiumDivider: {
    height: 1,
  },
  bottomSection: {
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  bottomLeft: {
    flex: 1,
    gap: 2,
  },
  bottomTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  bottomSubtitle: {
    fontSize: 12,
    fontWeight: "500",
  },
  bottomMemberCount: {
    fontSize: 12,
    fontWeight: "500",
  },
  bottomButton: {
  },
  bottomButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  podiumRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 10,
    minHeight: PODIUM_HEIGHTS[1] + 16,
    paddingTop: 8,
  },
  podiumSlot: {
    flex: 1,
    maxWidth: 90,
  },
  podiumCard: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 10,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 2,
  },
  podiumCardContent: {
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 2,
  },
  podiumCardFirst: {
    borderWidth: 1.5,
  },
  rankBadgeFloating: {
    position: "absolute",
    top: -10,
    alignSelf: "center",
    zIndex: 10,
  },
  rankBadgeCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  rankBadge: {
    position: "absolute",
    top: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rankBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "700",
  },
  playerName: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 2,
  },
  playerNameHighlight: {
    fontWeight: "800",
  },
  pointsRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  pointsValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  pointsLabel: {
    fontSize: 9,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  userDivider: {
    height: 1,
    marginTop: 12,
    marginBottom: 10,
  },
  userRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  userRankCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  userRankText: {
    fontSize: 11,
    fontWeight: "700",
  },
  userName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
  },
  userPoints: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    flexShrink: 0,
    marginLeft: "auto",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 12,
    fontWeight: "500",
  },
  viewAllCenter: {
    alignItems: "center",
    marginTop: 12,
  },
  viewAllBtn: {
    paddingVertical: 7,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  viewAllBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.8,
  },
  // Empty / zero points state styles
  zeroHeaderText: {
    fontSize: 13,
    fontWeight: "600",
  },
  // Skeleton styles
  skeletonIcon: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  skeletonHeaderText: {
    width: 80,
    height: 12,
    borderRadius: 4,
  },
  skeletonPodiumCard: {
    borderRadius: 12,
    width: "100%",
  },
  skeletonButton: {
    height: 44,
    borderRadius: 10,
  },
});
