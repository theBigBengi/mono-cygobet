// features/groups/group-lobby/screens/GroupLobbyActiveScreen.tsx
// Active state screen for group lobby.
// Shows fixtures and meta information.
// Group name is displayed in the header instead.

import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Card, AppText } from "@/components/ui";
import { useGroupRankingQuery, useUnreadCountsQuery } from "@/domains/groups";
import { useTheme } from "@/lib/theme";
import type { ApiGroupItem } from "@repo/types";
import { useCountdown } from "@/features/groups/predictions/hooks";
import {
  GroupLobbyFixturesSection,
  useGroupDuration,
  type FixtureItem,
} from "../index";
import { useGroupActivityStats } from "../hooks/useGroupActivityStats";
import { formatDate } from "@/utils/date";

interface GroupLobbyActiveScreenProps {
  /**
   * Group data (includes fixtures when fetched with includeFixtures)
   */
  group: ApiGroupItem;
  /**
   * Callback to refresh all data
   */
  onRefresh: () => Promise<void>;
  /**
   * Whether the current user is the creator
   */
  isCreator: boolean;
}

/**
 * Group Lobby Active Screen
 * 
 * Screen component for viewing a group in active status.
 * Shows fixtures and meta information.
 * Group name is displayed in the header instead.
 */
export function GroupLobbyActiveScreen({
  group,
  onRefresh,
  isCreator,
}: GroupLobbyActiveScreenProps) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { theme } = useTheme();
  const { data: rankingData } = useGroupRankingQuery(group.id);
  const { data: unreadData } = useUnreadCountsQuery();
  const chatUnreadCount = unreadData?.data?.[String(group.id)] ?? 0;

  const leader = rankingData?.data?.[0];

  // Derive fixtures from group.fixtures
  const fixtures =
    Array.isArray((group as any).fixtures) ? ((group as any).fixtures as FixtureItem[]) : [];

  // Client-side activity stats from fixtures (getGroupById doesn't return these counts)
  const activityStats = useGroupActivityStats(fixtures);
  const duration = useGroupDuration(fixtures);
  const nextGameCountdownLabel = useCountdown(
    activityStats.nextGame?.kickoffAt ?? null
  );

  // Progress: use API stats when present, otherwise derive from fixtures (getGroupById doesn't return these)
  const totalFixtures = group.totalFixtures ?? fixtures.length;
  const predictionsCount =
    group.predictionsCount ??
    fixtures.filter((f) => f.prediction != null && f.prediction !== undefined).length;

  // Handler for navigating to games (Predictions banner opens games page)
  const handleViewGames = () => {
    router.push(`/groups/${group.id}/games` as any);
  };

  // Handler for navigating to predictions overview
  const handleViewPredictionsOverview = () => {
    router.push(`/groups/${group.id}/predictions-overview` as any);
  };

  // Handler for navigating to ranking
  const handleViewRanking = () => {
    router.push(`/groups/${group.id}/ranking` as any);
  };

  // Handler for navigating to members
  const handleViewMembers = () => {
    router.push(`/groups/${group.id}/members` as any);
  };

  // Handler for navigating to invite
  const handleViewInvite = () => {
    router.push(`/groups/${group.id}/invite` as any);
  };

  const handleViewChat = () => {
    router.push(`/groups/${group.id}/chat` as any);
  };

  return (
    <View style={styles.container}>
      <Screen
        contentContainerStyle={styles.screenContent}
        onRefresh={onRefresh}
        scroll
      >
        {/* Activity summary: LIVE, today, next game countdown, last game */}
        {(activityStats.liveGamesCount > 0 ||
          activityStats.todayGamesCount > 0 ||
          activityStats.nextGame ||
          duration?.lastGame) && (
          <Card style={styles.activitySummaryCard}>
            <View style={styles.activitySummaryContent}>
              {activityStats.liveGamesCount > 0 && (
                <Pressable
                  onPress={handleViewGames}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.activitySummaryRow}
                >
                  <AppText
                    variant="caption"
                    style={[styles.liveLabel, { color: "#EF4444" }]}
                  >
                    {activityStats.liveGamesCount}{" "}
                    {t("lobby.game", { count: activityStats.liveGamesCount })}{" "}
                    {t("lobby.gamesLiveNow")}
                  </AppText>
                </Pressable>
              )}
              {activityStats.todayGamesCount > 0 && (
                <AppText
                  variant="caption"
                  color="secondary"
                  style={styles.activitySummaryRow}
                >
                  {activityStats.todayGamesCount}{" "}
                  {t("lobby.game", { count: activityStats.todayGamesCount })}{" "}
                  {t("lobby.gamesToday")}
                  {activityStats.todayUnpredictedCount > 0
                    ? ` – ${t("lobby.needPredictions", { count: activityStats.todayUnpredictedCount })}`
                    : ` – ${t("lobby.allPredictionsSet")}`}
                </AppText>
              )}
              {activityStats.nextGame && activityStats.liveGamesCount === 0 && (
                <AppText
                  variant="caption"
                  color="secondary"
                  style={styles.activitySummaryRow}
                >
                  {nextGameCountdownLabel.startsWith("in ")
                    ? `Next game starts ${nextGameCountdownLabel}`
                    : `Next game: ${nextGameCountdownLabel}`}
                </AppText>
              )}
              {duration?.lastGame && (
                <AppText
                  variant="caption"
                  color="secondary"
                  style={styles.activitySummaryRow}
                >
                  {t("lobby.endsApproximately", { date: formatDate(duration.endDate) })}
                </AppText>
              )}
            </View>
          </Card>
        )}

        {/* Predictions / Games Section - tap opens games page */}
        <GroupLobbyFixturesSection
          fixtures={fixtures}
          groupId={group.id}
          bannerTitle={t("groups.predictions")}
          onBannerPress={handleViewGames}
          predictionsCount={predictionsCount}
          totalFixtures={totalFixtures}
        />

        {/* Ranking Section */}
        <Card style={styles.bannerCard}>
          <Pressable
            onPress={handleViewRanking}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <AppText variant="body" style={styles.bannerText}>
              {t("groups.ranking")}
            </AppText>
            {leader && (
              <AppText variant="caption" color="secondary" style={styles.leaderText}>
                {t("lobby.leader", {
                  name: leader.username ?? `Player #${leader.rank}`,
                })}
              </AppText>
            )}
          </Pressable>
        </Card>

        {/* Members Section */}
        <Card style={styles.bannerCard}>
          <Pressable
            onPress={handleViewMembers}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <AppText variant="body" style={styles.bannerText}>
              Members
            </AppText>
          </Pressable>
        </Card>

        {/* Chat Section */}
        <Card style={styles.bannerCard}>
          <Pressable
            onPress={handleViewChat}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={styles.chatRow}>
              <AppText variant="body" style={styles.bannerText}>
                {t("groups.chat")}
              </AppText>
              {chatUnreadCount > 0 && (
                <View
                  style={[
                    styles.chatUnreadBadge,
                    { backgroundColor: theme.colors.primary },
                  ]}
                >
                  <AppText
                    variant="caption"
                    style={[
                      styles.chatUnreadText,
                      { color: theme.colors.primaryText },
                    ]}
                  >
                    {chatUnreadCount > 99 ? "99+" : String(chatUnreadCount)}
                  </AppText>
                </View>
              )}
            </View>
          </Pressable>
        </Card>

        {/* Invite Section - show only if inviteAccess is "all" or user is creator (owner) */}
        {(group.inviteAccess !== "admin_only" || isCreator) && (
          <Card style={styles.bannerCard}>
            <Pressable
              onPress={handleViewInvite}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <AppText variant="body" style={styles.bannerText}>
                Invite
              </AppText>
            </Pressable>
          </Card>
        )}

        {/* Predictions Overview Section */}
        <Card style={styles.predictionsOverviewCard}>
          <Pressable
            onPress={handleViewPredictionsOverview}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <AppText variant="body" style={styles.predictionsOverviewText}>
              {t("groups.predictionsOverview")}
            </AppText>
          </Pressable>
        </Card>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenContent: {
    paddingBottom: 16,
  },
  bannerCard: {
    marginBottom: 16,
  },
  bannerText: {
    fontWeight: "600",
  },
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chatUnreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  chatUnreadText: {
    fontSize: 11,
    fontWeight: "700",
  },
  leaderText: {
    marginTop: 4,
  },
  predictionsOverviewCard: {
    marginBottom: 16,
  },
  predictionsOverviewText: {
    fontWeight: "600",
  },
  activitySummaryCard: {
    marginBottom: 16,
  },
  activitySummaryContent: {
    gap: 6,
  },
  activitySummaryRow: {
    marginBottom: 2,
  },
  liveLabel: {
    fontWeight: "600",
  },
});
