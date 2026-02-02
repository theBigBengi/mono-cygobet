// features/groups/ranking/screens/GroupRankingScreen.tsx
// Screen component for group ranking.

import React from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import { Screen, Card, AppText, Row } from "@/components/ui";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import { useGroupQuery, useGroupRankingQuery, useNudgeMutation } from "@/domains/groups";
import { groupsKeys } from "@/domains/groups/groups.keys";
import { useAuth } from "@/lib/auth/useAuth";
import { useTheme } from "@/lib/theme";
import { shareText, buildRankingShareText } from "@/utils/sharing";
import type { ApiRankingItem } from "@repo/types";

interface GroupRankingScreenProps {
  groupId: number | null;
}

function RankingRow({
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
  const { theme } = useTheme();
  const router = useRouter();

  const onPress = () => {
    if (groupId == null) return;
    router.push(
      `/groups/${groupId}/member/${item.userId}?username=${encodeURIComponent(item.username || `Player #${item.rank}`)}&rank=${item.rank}&totalPoints=${item.totalPoints}&correctScoreCount=${item.correctScoreCount}&predictionCount=${item.predictionCount}` as any
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

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.sm, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Card
        style={[
          styles.card,
          {
            borderWidth: isCurrentUser ? 2 : 1,
            borderColor: isCurrentUser
              ? theme.colors.primary
              : theme.colors.border,
          },
        ]}
      >
        <Row gap={theme.spacing.md} style={styles.row}>
          <AppText variant="body" style={styles.rank}>
            {item.rank}
          </AppText>
          <AppText
            variant="body"
            numberOfLines={1}
            style={styles.username}
          >
            {item.username || `Player #${item.rank}`}
          </AppText>
          {showNudgeButton && (
            <Pressable
              onPress={handleNudgePress}
              disabled={!canNudge || isNudgePending}
              hitSlop={8}
              style={styles.nudgeButton}
            >
              <Ionicons
                name={canNudge ? "notifications" : "notifications-off"}
                size={22}
                color={canNudge ? theme.colors.primary : theme.colors.textSecondary}
              />
            </Pressable>
          )}
          <AppText variant="body" style={styles.points}>
            {item.totalPoints}
          </AppText>
        </Row>
        <AppText variant="caption" color="secondary" style={styles.stats}>
          {item.correctScoreCount} exact / {item.predictionCount} predictions
        </AppText>
      </Card>
    </Pressable>
  );
}

/**
 * GroupRankingScreen component
 *
 * Fetches and displays group ranking. Shows loading and error states.
 * Current user row is highlighted. Pull-to-refresh supported.
 */
export function GroupRankingScreen({ groupId }: GroupRankingScreenProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: groupData } = useGroupQuery(groupId);
  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useGroupRankingQuery(groupId);
  const nudgeMutation = useNudgeMutation(groupId);

  const groupName = groupData?.data?.name;
  const myRow = data?.data?.find((item) => item.userId === user?.id);
  const canShare = groupId != null && groupName && myRow != null;
  const handleShare = () => {
    if (!canShare || !myRow) return;
    shareText(
      buildRankingShareText({
        username: myRow.username ?? "Me",
        rank: myRow.rank,
        totalPoints: myRow.totalPoints,
        groupName: groupName!,
      })
    );
  };

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

  const items = data.data;

  return (
    <View style={styles.container}>
      {canShare && (
        <Pressable onPress={handleShare} style={styles.shareButton}>
          <Ionicons
            name="share-outline"
            size={22}
            color={theme.colors.primary}
          />
          <AppText variant="body" style={{ color: theme.colors.primary, marginLeft: 6 }}>
            {t("share.shareRanking")}
          </AppText>
        </Pressable>
      )}
      <FlatList
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
            colors={Platform.OS === "android" ? [theme.colors.primary] : undefined}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listContent: {
    flexGrow: 1,
  },
  card: {
    minHeight: 56,
  },
  row: {
    flex: 1,
  },
  rank: {
    fontWeight: "700",
    minWidth: 28,
  },
  username: {
    flex: 1,
    fontWeight: "500",
  },
  nudgeButton: {
    padding: 4,
  },
  points: {
    fontSize: 18,
    fontWeight: "700",
  },
  stats: {
    marginTop: 4,
  },
});
