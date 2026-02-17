// features/groups/group-lobby/screens/GroupLobbyEndedScreen.tsx
// Ended state screen for group lobby.
// Shows group ended banner, ranking, fixtures with final scores, and predictions overview.
// Read-only; no invite section or prediction editing.

import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Card, AppText } from "@/components/ui";
import { useGoBack } from "@/hooks/useGoBack";
import { useGroupRankingQuery, useUnreadCountsQuery } from "@/domains/groups";
import type { ApiGroupItem } from "@repo/types";
import { GroupLobbyHeader } from "../components/GroupLobbyHeader";
import { GroupInfoSheet } from "../components/GroupInfoSheet";
import { GroupLobbyFixturesSection } from "../components/GroupLobbyFixturesSection";
import { useGroupDuration } from "../hooks/useGroupDuration";
import type { FixtureItem } from "../types";
import { formatDate } from "@/utils/date";
import { LobbyActionCard } from "../components/LobbyActionCard";

interface GroupLobbyEndedScreenProps {
  group: ApiGroupItem;
  onRefresh: () => Promise<void>;
  isCreator: boolean;
  isLoading?: boolean;
  onSettingsPress?: () => void;
}

/**
 * Group Lobby Ended Screen
 *
 * Screen component for viewing a group in ended status.
 * Shows banner, ranking, fixtures with final scores, and predictions overview.
 * No invite section; read-only.
 */
export function GroupLobbyEndedScreen({
  group,
  onRefresh,
  isCreator,
  isLoading,
  onSettingsPress,
}: GroupLobbyEndedScreenProps) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const goBack = useGoBack("/(tabs)/groups");
  const infoSheetRef =
    useRef<React.ComponentRef<typeof BottomSheetModal>>(null);
  const { data: rankingData } = useGroupRankingQuery(group.id);
  const { data: unreadData } = useUnreadCountsQuery();
  const chatUnreadCount = unreadData?.data?.[String(group.id)] ?? 0;
  const winner = rankingData?.data?.[0];

  const fixtures = Array.isArray((group as any).fixtures)
    ? ((group as any).fixtures as FixtureItem[])
    : [];

  const duration = useGroupDuration(fixtures);

  const handleViewAllGames = () => {
    router.push(`/groups/${group.id}/games` as any);
  };

  const handleViewPredictionsOverview = () => {
    router.push(`/groups/${group.id}/predictions-overview` as any);
  };

  const handleViewRanking = () => {
    router.push(`/groups/${group.id}/ranking` as any);
  };

  const handleViewChat = () => {
    router.push(`/groups/${group.id}/chat` as any);
  };

  const handleOpenSettings = () => {
    router.push(`/groups/${group.id}/settings` as any);
  };

  return (
    <View style={styles.container}>
      <Screen
        contentContainerStyle={styles.screenContent}
        onRefresh={onRefresh}
        scroll
      >
        {/* Group Header */}
        <GroupLobbyHeader
          name={group.name}
          memberCount={group.memberCount}
          status="ended"
          privacy={group.privacy}
          compact
          onBack={goBack}
          onInfoPress={() => infoSheetRef.current?.present()}
          onSettingsPress={onSettingsPress}
        />

        {/* Group Ended Banner */}
        <Card style={styles.bannerCard}>
          <AppText variant="body" style={styles.bannerText}>
            {duration
              ? t("lobby.groupEndedDuration", {
                  count: duration.durationDays as number,
                  start: formatDate(duration.startDate),
                  end: formatDate(duration.endDate),
                })
              : t("lobby.groupEnded")}
          </AppText>
        </Card>

        {/* Winner card */}
        {winner && (
          <Card style={styles.winnerCard}>
            <View style={styles.winnerRow}>
              <AppText style={styles.winnerEmoji}>🏆</AppText>
              <View style={styles.winnerTextBlock}>
                <AppText variant="body" style={styles.winnerName}>
                  {winner.username ?? t("lobby.winner")}
                </AppText>
                <AppText variant="caption" color="secondary">
                  {t("lobby.winnerPoints", { points: winner.totalPoints })}
                </AppText>
              </View>
            </View>
          </Card>
        )}

        {/* Fixtures Section with final scores */}
        <GroupLobbyFixturesSection
          onViewAll={handleViewAllGames}
          fixtures={fixtures}
          groupId={group.id}
          showFixtureCards={true}
          showFinalScores={true}
        />

        {/* Ranking Section */}
        <LobbyActionCard
          icon="trophy-outline"
          title={t("lobby.ranking")}
          onPress={handleViewRanking}
        />

        {/* Chat Section (read-only for ended groups) */}
        <LobbyActionCard
          icon="chatbubble-outline"
          title={t("lobby.chat")}
          badge={chatUnreadCount}
          onPress={handleViewChat}
        />

        {/* Predictions Overview Section */}
        <LobbyActionCard
          icon="stats-chart-outline"
          title={t("lobby.predictionsOverview")}
          onPress={handleViewPredictionsOverview}
        />

        {/* Settings Section - LAST BANNER */}
        <LobbyActionCard
          icon="settings-outline"
          title={t("lobby.settings" as Parameters<typeof t>[0])}
          subtitle={t("lobby.settingsSubtitle" as Parameters<typeof t>[0])}
          onPress={handleOpenSettings}
        />
      </Screen>
      <GroupInfoSheet
        group={group}
        sheetRef={infoSheetRef}
        isLoading={isLoading}
      />
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
  winnerCard: {
    marginBottom: 16,
  },
  winnerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  winnerEmoji: {
    fontSize: 32,
  },
  winnerTextBlock: {
    flex: 1,
  },
  winnerName: {
    fontWeight: "700",
  },
});
