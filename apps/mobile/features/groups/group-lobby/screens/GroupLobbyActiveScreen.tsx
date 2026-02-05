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
import { useAuth } from "@/lib/auth/useAuth";
import type { ApiGroupItem } from "@repo/types";
import { useCountdown } from "@/features/groups/predictions/hooks";
import {
  GroupLobbyFixturesSection,
  useGroupDuration,
  type FixtureItem,
} from "../index";
import { useGroupActivityStats } from "../hooks/useGroupActivityStats";
import { formatDate } from "@/utils/date";
import { LobbyActionCard } from "../components/LobbyActionCard";

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
  const { user } = useAuth();
  const { data: rankingData } = useGroupRankingQuery(group.id);
  const { data: unreadData } = useUnreadCountsQuery();
  const chatUnreadCount = unreadData?.data?.[String(group.id)] ?? 0;

  const leader = rankingData?.data?.[0];
  const myRank =
    rankingData?.data?.find((r) => r.userId === user?.id)?.rank ?? null;

  // Derive fixtures from group.fixtures
  const fixtures = Array.isArray((group as any).fixtures)
    ? ((group as any).fixtures as FixtureItem[])
    : [];

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
    fixtures.filter((f) => f.prediction != null && f.prediction !== undefined)
      .length;

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
                  <View style={styles.liveRow}>
                    <View style={styles.liveDot} />
                    <AppText
                      variant="caption"
                      style={[styles.liveLabel, { color: "#EF4444" }]}
                    >
                      {activityStats.liveGamesCount}{" "}
                      {t("lobby.game", { count: activityStats.liveGamesCount })}{" "}
                      {t("lobby.gamesLiveNow")}
                    </AppText>
                  </View>
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
                    ? t("lobby.nextGameStarts", {
                        countdown: nextGameCountdownLabel,
                      })
                    : t("lobby.nextGameLabel", {
                        countdown: nextGameCountdownLabel,
                      })}
                </AppText>
              )}
              {duration?.lastGame && (
                <AppText
                  variant="caption"
                  color="secondary"
                  style={styles.activitySummaryRow}
                >
                  {t("lobby.endsApproximately", {
                    date: formatDate(duration.endDate),
                  })}
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
        <LobbyActionCard
          icon="trophy-outline"
          title={t("lobby.ranking")}
          subtitle={
            [
              myRank != null ? t("lobby.yourRank", { rank: myRank }) : null,
              leader
                ? t("lobby.leaderWithPoints", {
                    name: leader.username ?? `Player #${leader.rank}`,
                    points: leader.totalPoints,
                  })
                : null,
            ]
              .filter(Boolean)
              .join(" · ") || undefined
          }
          onPress={handleViewRanking}
        />

        {/* Chat Section */}
        <LobbyActionCard
          icon="chatbubble-outline"
          title={t("lobby.chat")}
          badge={chatUnreadCount}
          onPress={handleViewChat}
        />

        {/* Invite Section - show only if inviteAccess is "all" or user is creator (owner) */}
        {(group.inviteAccess !== "admin_only" || isCreator) && (
          <LobbyActionCard
            icon="link-outline"
            title={t("lobby.invite")}
            subtitle={t("lobby.shareGroupLink")}
            onPress={handleViewInvite}
          />
        )}

        {/* Predictions Overview Section */}
        <LobbyActionCard
          icon="stats-chart-outline"
          title={t("lobby.predictionsOverview")}
          onPress={handleViewPredictionsOverview}
        />
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
  activitySummaryCard: {
    marginBottom: 16,
  },
  activitySummaryContent: {
    gap: 6,
  },
  activitySummaryRow: {
    marginBottom: 2,
  },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  liveLabel: {
    fontWeight: "600",
  },
});
