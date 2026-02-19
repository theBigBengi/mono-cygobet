// features/groups/group-lobby/components/LobbyLeaderboard.tsx
// Podium-style leaderboard with cards for top 3 players.

import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable, Text } from "react-native";
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
const PODIUM_HEIGHTS = [120, 145, 110] as const; // 2nd, 1st, 3rd place heights

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

export function LobbyLeaderboard({
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
          {/* Skeleton Header */}
          <View style={styles.sectionHeader}>
            <Animated.View
              style={[
                styles.skeletonIcon,
                { backgroundColor: theme.colors.border },
                animatedStyle,
              ]}
            />
            <Animated.View
              style={[
                styles.skeletonHeaderText,
                { backgroundColor: theme.colors.border },
                animatedStyle,
              ]}
            />
          </View>

          {/* Skeleton Podium */}
          <View style={styles.podiumRow}>
            {[90, 110, 80].map((height, index) => (
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

  if (top3.length === 0) {
    return (
      <View style={styles.container}>
        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor: theme.colors.cardBackground,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Ionicons name="trophy-outline" size={32} color={theme.colors.textSecondary} />
          <AppText variant="caption" color="secondary" style={styles.emptyText}>
            {t("lobby.rankingPending")}
          </AppText>
        </View>
      </View>
    );
  }

  // Reorder for podium: [2nd, 1st, 3rd]
  const podiumOrder = top3.length >= 2
    ? [top3[1], top3[0], top3[2]].filter(Boolean)
    : top3;

  const renderPodiumCard = (item: ApiRankingItem | undefined, podiumIndex: number) => {
    if (!item) return <View key={podiumIndex} style={styles.podiumSlot} />;

    const actualRank = item.rank;
    const rankColorIndex = actualRank - 1;
    const isCurrentUser = currentUserId != null && item.userId === currentUserId;
    const displayName = isCurrentUser ? t("lobby.you") : (item.username ?? `#${item.rank}`);
    const height = PODIUM_HEIGHTS[podiumIndex];
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

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.wrapper,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderBottomColor: theme.colors.textSecondary + "40",
          },
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
                borderColor: theme.colors.primary + "40",
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
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
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
              borderBottomColor: theme.colors.textSecondary + "40",
              transform: [{ scale: pressed ? 0.96 : 1 }, { translateY: pressed ? 2 : 0 }],
            },
            pressed && styles.pressed,
          ]}
        >
          <View style={[styles.buttonIconCircle, { backgroundColor: theme.colors.primary + "15" }]}>
            <Ionicons name="podium-outline" size={16} color={theme.colors.primary} />
          </View>
          <Text style={[styles.buttonText, { color: theme.colors.textPrimary }]}>
            {t("lobby.leaderboard")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  wrapper: {
    borderRadius: 16,
    borderWidth: 1,
    borderBottomWidth: 3,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
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
    marginBottom: 16,
    paddingTop: 8,
  },
  podiumSlot: {
    flex: 1,
    maxWidth: 110,
  },
  podiumCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderBottomWidth: 3,
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
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderBottomWidth: 3,
    marginBottom: 16,
    gap: 10,
  },
  userRankCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  userRankText: {
    fontSize: 13,
    fontWeight: "700",
  },
  userName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  userPoints: {
    fontSize: 14,
    fontWeight: "600",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderBottomWidth: 3,
  },
  buttonIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  pressed: {
    opacity: 0.8,
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
