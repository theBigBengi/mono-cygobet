// features/groups/ranking/screens/GroupRankingScreen.tsx
// Screen component for group ranking with game-like styling.

import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
  Text,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import { Screen, AppText } from "@/components/ui";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import {
  useGroupQuery,
  useGroupRankingQuery,
  useNudgeMutation,
} from "@/domains/groups";
import { groupsKeys } from "@/domains/groups/groups.keys";
import { useAuth } from "@/lib/auth/useAuth";
import { useTheme } from "@/lib/theme";
import type { ApiRankingItem } from "@repo/types";

interface GroupRankingScreenProps {
  groupId: number | null;
}

function getInitials(name: string): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const AVATAR_SIZE = 40;
const PODIUM_COLORS = {
  1: "#FFD700", // Gold
  2: "#C0C0C0", // Silver
  3: "#CD7F32", // Bronze
};

const RankingRow = React.memo(function RankingRow({
  item,
  isCurrentUser,
  groupId,
  nudgeEnabled,
  onNudgePress,
  isNudgePending,
}: {
  item: ApiRankingItem;
  isCurrentUser: boolean;
  groupId: number | null;
  nudgeEnabled: boolean;
  onNudgePress: (targetUserId: number, fixtureId: number) => void;
  isNudgePending: boolean;
}) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const router = useRouter();
  const [isPressed, setIsPressed] = useState(false);

  const displayName =
    item.username || t("chat.playerFallback", { id: item.rank });
  const initials = getInitials(displayName);

  const onPress = () => {
    if (groupId == null) return;
    router.push(
      `/groups/${groupId}/member/${item.userId}?username=${encodeURIComponent(displayName)}&rank=${item.rank}&totalPoints=${item.totalPoints}&correctScoreCount=${item.correctScoreCount}&predictionCount=${item.predictionCount}` as any
    );
  };

  const showNudgeButton =
    nudgeEnabled &&
    item.nudgeable === true &&
    !isCurrentUser &&
    item.nudgeFixtureId != null;
  const canNudge = showNudgeButton && !item.nudgedByMe;

  const handleNudgePress = () => {
    if (!canNudge || item.nudgeFixtureId == null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNudgePress(item.userId, item.nudgeFixtureId);
  };

  const handlePressIn = () => {
    setIsPressed(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    setIsPressed(false);
  };

  const isTopThree = item.rank <= 3;
  const podiumColor = isTopThree
    ? PODIUM_COLORS[item.rank as 1 | 2 | 3]
    : theme.colors.surface;

  const rankChange = item.rankChange ?? 0;

  return (
    <View style={styles.rowContainer}>
      {/* Rank Badge - Outside Card */}
      <View
        style={[
          styles.rankBadge,
          {
            backgroundColor: isTopThree
              ? podiumColor
              : theme.colors.surface,
          },
        ]}
      >
        <Text
          style={[
            styles.rankText,
            {
              color: isTopThree
                ? item.rank === 1
                  ? "#1a1a1a"
                  : "#fff"
                : theme.colors.textPrimary,
            },
          ]}
        >
          {item.rank}
        </Text>
        {rankChange !== 0 && (
          <View
            style={[
              styles.rankChangeIndicator,
              {
                backgroundColor: rankChange > 0 ? "#10B981" : "#EF4444",
              },
            ]}
          >
            <Ionicons
              name={rankChange > 0 ? "arrow-up" : "arrow-down"}
              size={8}
              color="#fff"
            />
          </View>
        )}
      </View>

      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.cardPressable}
      >
        <View
          style={[
            styles.cardShadowWrapper,
            {
              shadowColor: isTopThree ? podiumColor : "#000",
              shadowOpacity: isPressed ? 0 : isTopThree ? 0.3 : 0.12,
            },
            isPressed && styles.cardPressed,
          ]}
        >
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.cardBackground,
                borderColor: theme.colors.border,
              },
            ]}
          >
            {/* Main Row */}
            <View style={styles.mainRow}>
              {/* Avatar */}
              <View
                style={[
                  styles.avatar,
                  {
                    backgroundColor: theme.colors.primary,
                    shadowColor: "#000",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.initials,
                    { color: theme.colors.primaryText },
                  ]}
                >
                  {initials}
                </Text>
              </View>

              {/* Name & Stats */}
              <View style={styles.info}>
                <Text
                  style={[styles.username, { color: theme.colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {displayName}
                </Text>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Ionicons
                      name="checkmark-circle"
                      size={12}
                      color="#10B981"
                    />
                    <Text
                      style={[
                        styles.statText,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {item.correctScoreCount} {t("ranking.exact")}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons
                      name="swap-horizontal"
                      size={12}
                      color="#F59E0B"
                    />
                    <Text
                      style={[
                        styles.statText,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {item.correctDifferenceCount ?? 0} {t("ranking.diff")}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons
                      name="document-text"
                      size={12}
                      color={theme.colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.statText,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {item.predictionCount} {t("ranking.predictions")}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Points */}
              <View style={styles.pointsContainer}>
                <Text
                  style={[
                    styles.pointsValue,
                    {
                      color: isTopThree ? podiumColor : theme.colors.primary,
                    },
                  ]}
                >
                  {item.totalPoints}
                </Text>
                <Text
                  style={[
                    styles.pointsLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {t("ranking.pts")}
                </Text>
              </View>

              {/* Nudge Button */}
              {showNudgeButton && (
                <Pressable
                  onPress={handleNudgePress}
                  disabled={!canNudge || isNudgePending}
                  hitSlop={8}
                  style={[
                    styles.nudgeButton,
                    {
                      backgroundColor: canNudge
                        ? theme.colors.primary + "15"
                        : theme.colors.surface,
                    },
                  ]}
                >
                  <Ionicons
                    name={canNudge ? "notifications" : "notifications-off"}
                    size={18}
                    color={
                      canNudge ? theme.colors.primary : theme.colors.textSecondary
                    }
                  />
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );
});

/**
 * GroupRankingScreen component
 *
 * Fetches and displays group ranking with game-like styling.
 * Current user row is highlighted. Pull-to-refresh supported.
 */
export function GroupRankingScreen({ groupId }: GroupRankingScreenProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: groupData } = useGroupQuery(groupId);
  const { data, isLoading, error, refetch, isRefetching } =
    useGroupRankingQuery(groupId);
  const nudgeMutation = useNudgeMutation(groupId);
  const flatListRef = useRef<FlatList>(null);
  const items = data?.data ?? [];
  const myIndex = items.findIndex((i) => i.userId === user?.id);

  useEffect(() => {
    if (myIndex > 0 && flatListRef.current) {
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: myIndex,
          animated: true,
          viewPosition: 0.5,
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [myIndex]);

  const handleNudgePress = (targetUserId: number, fixtureId: number) => {
    if (!groupId) return;
    nudgeMutation.mutate(
      { targetUserId, fixtureId },
      {
        onSuccess: () => {
          queryClient.setQueryData(
            groupsKeys.ranking(groupId),
            (old: { data: ApiRankingItem[] } | undefined) => {
              if (!old) return old;
              return {
                ...old,
                data: old.data.map((row) =>
                  row.userId === targetUserId
                    ? { ...row, nudgedByMe: true }
                    : row
                ),
              };
            }
          );
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Screen>
        <QueryLoadingView message={t("ranking.loadingRanking")} />
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen>
        <QueryErrorView
          message={t("ranking.failedLoadRanking")}
          onRetry={() => refetch()}
        />
      </Screen>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <AppText variant="body" color="secondary" style={styles.emptyState}>
          {t("ranking.empty")}
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={items}
        keyExtractor={(item) => String(item.userId)}
        renderItem={({ item }) => (
          <RankingRow
            item={item}
            isCurrentUser={user?.id != null && item.userId === user.id}
            groupId={groupId}
            nudgeEnabled={groupData?.data?.nudgeEnabled === true}
            onNudgePress={handleNudgePress}
            isNudgePending={nudgeMutation.isPending}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: theme.spacing.md, paddingBottom: theme.spacing.md },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={theme.colors.primary}
            colors={
              Platform.OS === "android" ? [theme.colors.primary] : undefined
            }
          />
        }
        onScrollToIndexFailed={() => {
          // Fallback when list isn't ready; user can scroll manually
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    textAlign: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  listContent: {
    flexGrow: 1,
  },
  rowContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 10,
  },
  cardPressable: {
    flex: 1,
  },
  cardShadowWrapper: {
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  cardPressed: {
    shadowOpacity: 0,
    elevation: 0,
    transform: [{ scale: 0.98 }],
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    overflow: "hidden",
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  rankText: {
    fontSize: 14,
    fontWeight: "700",
  },
  rankChangeIndicator: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  initials: {
    fontSize: 14,
    fontWeight: "800",
  },
  info: {
    flex: 1,
  },
  username: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  statText: {
    fontSize: 11,
    fontWeight: "500",
  },
  pointsContainer: {
    alignItems: "center",
  },
  pointsValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  pointsLabel: {
    fontSize: 9,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  nudgeButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});
