// features/groups/group-lobby/components/LobbyLeaderboard.tsx
// Podium-style leaderboard with cards for top 3 players.

import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { CARD_BORDER_BOTTOM_WIDTH } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { ApiRankingItem } from "@repo/types";

const RANK_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"] as const; // Gold, Silver, Bronze
const PODIUM_HEIGHTS = [120, 155, 110] as const; // 2nd, 1st, 3rd place heights

export interface LobbyLeaderboardProps {
  ranking: ApiRankingItem[] | undefined;
  currentUserId: number | null;
  isLoading: boolean;
  onPress: () => void;
  memberCount?: number;
}

/** Get initials from username */
function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
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

  // Find current user's row
  const userRow = currentUserId
    ? allRanking.find((r) => r.userId === currentUserId)
    : null;
  const userInTop3 = userRow ? userRow.rank <= 3 : false;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View
          style={[
            styles.wrapper,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {/* Skeleton Podium */}
          <View style={styles.podiumRow}>
            {PODIUM_HEIGHTS.map((height, index) => (
              <View key={index} style={styles.podiumSlot}>
                <Animated.View
                  style={[
                    styles.skeletonPodiumCard,
                    {
                      height,
                      backgroundColor: theme.colors.border,
                    },
                    animatedStyle,
                  ]}
                />
              </View>
            ))}
          </View>

          {/* Skeleton Button */}
          <Animated.View
            style={[
              styles.skeletonButton,
              { backgroundColor: theme.colors.border },
              animatedStyle,
            ]}
          />
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
    const borderBottomColor = theme.colors.textSecondary + "40";

    return (
      <View style={styles.container}>
        <View
          style={[
            styles.wrapper,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderBottomColor,
            },
          ]}
        >
          {/* Message on top */}
          <Text style={[styles.zeroHeaderText, { color: theme.colors.textSecondary, textAlign: "center", marginBottom: 12, paddingHorizontal: 16 }]}>
            {message}
          </Text>

          {/* Placeholder podium: left=2nd, center=1st, right=3rd */}
          <View style={styles.podiumRow}>
              {([1, 0, 2] as const).map((rankIndex, visualIndex) => {
                const height = PODIUM_HEIGHTS[visualIndex];
                const rankColor = RANK_COLORS[rankIndex];
                return (
                  <View key={visualIndex} style={styles.podiumSlot}>
                    <View
                      style={[
                        styles.podiumCard,
                        {
                          height,
                          backgroundColor: theme.colors.cardBackground,
                          borderColor: rankColor + "40",
                          shadowColor: rankColor,
                        },
                      ]}
                    >
                      {/* Rank Badge */}
                      <View
                        style={[
                          styles.rankBadge,
                          { backgroundColor: rankColor },
                        ]}
                      >
                        <Text style={styles.rankBadgeText}>{rankIndex + 1}</Text>
                      </View>

                      {/* Avatar */}
                      <View
                        style={[
                          styles.avatar,
                          {
                            backgroundColor: rankColor + "30",
                            borderColor: rankColor,
                          },
                        ]}
                      >
                        <Text style={[styles.avatarText, { color: rankColor }]}>
                          ?
                        </Text>
                      </View>

                      {/* Name */}
                      <Text
                        style={[
                          styles.playerName,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        —
                      </Text>

                      {/* Points */}
                      <View style={styles.pointsRow}>
                        <Text style={[styles.pointsValue, { color: rankColor }]}>
                          –
                        </Text>
                        <Text style={[styles.pointsLabel, { color: theme.colors.textSecondary }]}>
                          pts
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

          {/* View Full Ranking Button */}
          <Pressable
            onPress={onPress}
            style={({ pressed }) => [
              styles.viewAllButton,
              {
                backgroundColor: theme.colors.cardBackground,
                borderColor: theme.colors.border,
                borderBottomColor,
                marginTop: 12,
                transform: [{ scale: pressed ? 0.96 : 1 }, { translateY: pressed ? 2 : 0 }],
              },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.buttonText, { color: theme.colors.textSecondary }]}>
              {t("lobby.leaderboard")}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={theme.colors.textSecondary} />
          </Pressable>
        </View>
      </View>
    );
  }

  // Reorder for podium: [2nd, 1st, 3rd]
  const podiumOrder = top3.length >= 2
    ? [top3[1], top3[0], top3[2]].filter(Boolean)
    : top3;

  const allSameRank = top3.length > 1 && top3.every((r) => r.rank === top3[0].rank);

  const renderPodiumCard = (item: ApiRankingItem | undefined, podiumIndex: number) => {
    if (!item) return <View key={podiumIndex} style={styles.podiumSlot} />;

    const actualRank = item.rank;
    const rankColorIndex = actualRank - 1;
    const isCurrentUser = currentUserId != null && item.userId === currentUserId;
    const displayName = isCurrentUser ? t("lobby.you") : (item.username ?? `#${item.rank}`);
    const height = allSameRank ? PODIUM_HEIGHTS[1] : PODIUM_HEIGHTS[podiumIndex];
    const isFirst = actualRank === 1;
    return (
      <Pressable
        key={item.userId}
        onPress={onPress}
        style={({ pressed }) => [
          styles.podiumSlot,
          pressed && styles.pressed,
        ]}
      >
        <View
          style={[
            styles.podiumCard,
            {
              height,
              backgroundColor: theme.colors.cardBackground,
              borderColor: RANK_COLORS[rankColorIndex] + "40",
              shadowColor: RANK_COLORS[rankColorIndex],
            },
            isFirst && styles.podiumCardFirst,
          ]}
        >
          {/* Rank Badge */}
          <View
            style={[
              styles.rankBadge,
              { backgroundColor: RANK_COLORS[rankColorIndex] },
            ]}
          >
            <Text style={styles.rankBadgeText}>{actualRank}</Text>
          </View>

          {/* Avatar */}
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: RANK_COLORS[rankColorIndex] + "30",
                borderColor: RANK_COLORS[rankColorIndex],
              },
            ]}
          >
            <Text
              style={[
                styles.avatarText,
                { color: RANK_COLORS[rankColorIndex] },
              ]}
            >
              {getInitials(item.username)}
            </Text>
          </View>

          {/* Name */}
          <Text
            style={[
              styles.playerName,
              { color: theme.colors.textPrimary },
              isCurrentUser && styles.playerNameHighlight,
            ]}
            numberOfLines={1}
          >
            {displayName}
          </Text>

          {/* Points */}
          <View style={styles.pointsRow}>
            <Text
              style={[
                styles.pointsValue,
                { color: RANK_COLORS[rankColorIndex] },
              ]}
            >
              {item.totalPoints}
            </Text>
            <Text style={[styles.pointsLabel, { color: theme.colors.textSecondary }]}>
              pts
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const borderBottomColor = theme.colors.textSecondary + "40";
  const primaryAlpha40 = theme.colors.primary + "40";
  const primaryAlpha15 = theme.colors.primary + "15";

  return (
    <Pressable
      style={styles.container}
      onPress={onPress}
    >
      {({ pressed }) => (
      <View
        style={[
          styles.wrapper,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderBottomColor,
          },
          pressed && styles.wrapperPressed,
        ]}
      >
        {/* Podium */}
        <View style={styles.podiumRow}>
          {podiumOrder.map((item, index) => renderPodiumCard(item, index))}
        </View>

        {/* User's position if not in top 3 */}
        {userRow && !userInTop3 && (
          <Pressable
            onPress={onPress}
            style={({ pressed }) => [
              styles.userCard,
              {
                backgroundColor: theme.colors.cardBackground,
                borderColor: theme.colors.border,
              },
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.userRankCircle, { backgroundColor: theme.colors.border }]}>
              <Text style={[styles.userRankText, { color: theme.colors.textSecondary }]}>
                {userRow.rank}
              </Text>
            </View>
            <Text
              style={[styles.userName, { color: theme.colors.textPrimary }]}
              numberOfLines={1}
            >
              {t("lobby.you")}
            </Text>
            <Text style={[styles.userPoints, { color: theme.colors.textSecondary }]}>
              {userRow.totalPoints} pts
            </Text>
          </Pressable>
        )}

        {/* View Full Ranking Button */}
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.viewAllButton,
            {
              backgroundColor: theme.colors.cardBackground,
              borderColor: theme.colors.border,
              borderBottomColor,
              transform: [{ scale: pressed ? 0.96 : 1 }, { translateY: pressed ? 2 : 0 }],
            },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.buttonText, { color: theme.colors.textSecondary }]}>
            {t("lobby.leaderboard")}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={theme.colors.textSecondary} />
        </Pressable>
      </View>
      )}
    </Pressable>
  );
}

export const LobbyLeaderboard = React.memo(LobbyLeaderboardInner);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  wrapper: {
    borderRadius: 16,
    borderWidth: 1,
    borderBottomWidth: CARD_BORDER_BOTTOM_WIDTH,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  wrapperPressed: {
    shadowOpacity: 0,
    elevation: 0,
    transform: [{ scale: 0.98 }, { translateY: 2 }],
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
  podiumRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
    paddingTop: 8,
  },
  podiumSlot: {
    flex: 1,
    maxWidth: 110,
  },
  podiumCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderBottomWidth: CARD_BORDER_BOTTOM_WIDTH,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  podiumCardFirst: {
    shadowOpacity: 0.25,
    elevation: 6,
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
    color: "#fff",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
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
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderBottomWidth: 2,
    marginBottom: 12,
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
    fontSize: 12,
    fontWeight: "600",
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
