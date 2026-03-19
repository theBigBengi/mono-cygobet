// features/groups/ranking/screens/GroupRankingScreen.tsx
// Screen component for group ranking with game-like styling.

import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { useRouter, type Href } from "expo-router";
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
import { useTheme, getShadowStyle } from "@/lib/theme";
import { getInitials } from "@/utils/string";
import type { ApiRankingItem } from "@repo/types";

interface GroupRankingScreenProps {
  groupId: number | null;
}

const AVATAR_SIZE = 40;
const ROW_HEIGHT = 40;
// PODIUM_COLORS moved to dynamic usage via theme.colors.gold/silver/bronze

const RankingRow = React.memo(function RankingRow({
  item,
  isCurrentUser,
  groupId,
  nudgeEnabled,
  onNudgePress,
  isNudgePending,
  ranking,
}: {
  item: ApiRankingItem;
  isCurrentUser: boolean;
  groupId: number | null;
  nudgeEnabled: boolean;
  onNudgePress: (targetUserId: number, fixtureId: number) => void;
  isNudgePending: boolean;
  ranking: ApiRankingItem[];
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
      `/groups/${groupId}/member/${item.userId}?username=${encodeURIComponent(displayName)}&rank=${item.rank}&totalPoints=${item.totalPoints}&correctScoreCount=${item.correctScoreCount}&predictionCount=${item.predictionCount}` as Href
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
  const podiumColors = { 1: theme.colors.gold, 2: theme.colors.silver, 3: theme.colors.bronze };
  const podiumColor = isTopThree
    ? podiumColors[item.rank as 1 | 2 | 3]
    : theme.colors.surface;

  const rankChange = item.rankChange ?? 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.rowContainer,
        { paddingHorizontal: theme.spacing.md, marginBottom: 6, gap: theme.spacing.sm },
        pressed && styles.cardPressed,
      ]}
    >
      {/* Rank */}
      <View style={[styles.rankBadge, { backgroundColor: theme.colors.textPrimary, borderRadius: theme.radius.full }]}>
        <Text style={[styles.rankText, { color: theme.colors.textInverse }]}>{item.rank}</Text>
        {rankChange !== 0 && (
          <View
            style={[
              styles.rankChangeIndicator,
              { backgroundColor: rankChange > 0 ? theme.colors.success : theme.colors.danger, borderRadius: theme.radius.full },
            ]}
          >
            <Ionicons
              name={rankChange > 0 ? "arrow-up" : "arrow-down"}
              size={7}
              color={theme.colors.textInverse}
            />
          </View>
        )}
      </View>

      <View style={[styles.barContent, { borderRadius: theme.radius.md, paddingVertical: theme.spacing.sm, paddingHorizontal: 10, backgroundColor: theme.colors.cardBackground, ...getShadowStyle("sm") }, isCurrentUser && { backgroundColor: theme.colors.textPrimary + "06" }]}>
        <View style={[styles.barOverlay, { gap: theme.spacing.sm }]}>
          <View style={styles.barLeft}>
            <Text
              style={[
                styles.username,
                { color: theme.colors.textPrimary },
                isCurrentUser && { fontWeight: "800" },
              ]}
              numberOfLines={1}
            >
              {isCurrentUser ? t("lobby.you") : displayName}
            </Text>
            <View style={[styles.statsRow, { gap: theme.spacing.xs }]}>
              <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                {item.correctScoreCount} {t("ranking.exact")}
              </Text>
              <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>·</Text>
              <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                {item.correctDifferenceCount ?? 0} {t("ranking.diff")}
              </Text>
              <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>·</Text>
              <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                {item.predictionCount} {t("ranking.predictions")}
              </Text>
            </View>
          </View>
          <Text style={[styles.pointsValue, { color: theme.colors.textPrimary }]}>
            {item.totalPoints}
            <Text style={[styles.pointsLabel, { color: theme.colors.textSecondary }]}> pts</Text>
          </Text>
          {showNudgeButton && (
            <Pressable
              onPress={handleNudgePress}
              disabled={!canNudge || isNudgePending}
              hitSlop={8}
              style={[
                styles.nudgeButton,
                { borderRadius: theme.radius.full, backgroundColor: canNudge ? theme.colors.primary + "10" : "transparent" },
              ]}
            >
              <Ionicons
                name={canNudge ? "notifications" : "notifications-off"}
                size={16}
                color={canNudge ? theme.colors.primary : theme.colors.textSecondary + "60"}
              />
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
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

  const renderRankingItem = useCallback(
    ({ item }: { item: (typeof items)[0] }) => (
      <RankingRow
        item={item}
        isCurrentUser={user?.id != null && item.userId === user.id}
        groupId={groupId}
        nudgeEnabled={groupData?.data?.nudgeEnabled === true}
        onNudgePress={handleNudgePress}
        isNudgePending={nudgeMutation.isPending}
        ranking={items}
      />
    ),
    [user?.id, groupId, groupData?.data?.nudgeEnabled, handleNudgePress, nudgeMutation.isPending, items],
  );

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <AppText variant="body" color="secondary" style={[styles.emptyState, { paddingVertical: theme.spacing.xxl, paddingHorizontal: theme.spacing.lg }]}>
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
        removeClippedSubviews={Platform.OS === "android"}
        maxToRenderPerBatch={10}
        initialNumToRender={10}
        windowSize={5}
        getItemLayout={(_data, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
        renderItem={renderRankingItem}
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
  },
  listContent: {
    flexGrow: 1,
  },
  rowContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardPressed: {
    opacity: 0.7,
  },
  rankBadge: {
    width: 22,
    height: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  rankText: {
    fontSize: 11,
    fontWeight: "800",
    // color set dynamically via theme.colors.textInverse
  },
  rankChangeIndicator: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 12,
    height: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  barContent: {
    flex: 1,
  },
  barOverlay: {
    flexDirection: "row",
    alignItems: "center",
  },
  barLeft: {
    flex: 1,
  },
  username: {
    fontSize: 13,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 1,
  },
  statText: {
    fontSize: 10,
    fontWeight: "500",
  },
  pointsValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  pointsLabel: {
    fontSize: 10,
    fontWeight: "500",
  },
  nudgeButton: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
});
