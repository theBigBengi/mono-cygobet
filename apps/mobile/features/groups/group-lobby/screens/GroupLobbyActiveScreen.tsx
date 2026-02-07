// features/groups/group-lobby/screens/GroupLobbyActiveScreen.tsx
// Active state screen for group lobby.
// Shows fixtures and meta information.
// Group name is displayed in the header instead.

import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons, Entypo, Fontisto } from "@expo/vector-icons";
import { Screen } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import {
  useGroupRankingQuery,
  useGroupChatPreviewQuery,
} from "@/domains/groups";
import type { ApiGroupItem } from "@repo/types";
import { GroupLobbyFixturesSection } from "../components/GroupLobbyFixturesSection";
import type { FixtureItem } from "../types";
import { formatRelativeTime } from "@/utils/date";
import { GroupLobbyHeader } from "../components/GroupLobbyHeader";
import { LobbyActionCard } from "../components/LobbyActionCard";
import { LobbyRankingPreview } from "../components/LobbyRankingPreview";

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
  const { data: rankingData, isLoading: isRankingLoading } =
    useGroupRankingQuery(group.id);
  const { data: chatPreviewData, isLoading: isChatLoading } =
    useGroupChatPreviewQuery();
  const chatPreview = chatPreviewData?.data?.[String(group.id)];
  const lastMessage = chatPreview?.lastMessage;

  // Derive fixtures from group.fixtures
  const fixtures = Array.isArray((group as any).fixtures)
    ? ((group as any).fixtures as FixtureItem[])
    : [];

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
          status="active"
        />

        {/* Predictions / Games Section - tap opens games page */}
        <GroupLobbyFixturesSection
          fixtures={fixtures}
          groupId={group.id}
          bannerTitle={t("groups.predictions")}
          onBannerPress={handleViewGames}
          predictionsCount={predictionsCount}
          totalFixtures={totalFixtures}
          icon={
            <MaterialIcons
              name="batch-prediction"
              size={24}
              color={theme.colors.primary}
            />
          }
        />

        {/* Ranking Section */}
        <LobbyRankingPreview
          ranking={rankingData?.data}
          isLoading={isRankingLoading}
          onPress={handleViewRanking}
        />

        {/* Chat Section */}
        <LobbyActionCard
          customIcon={
            <Entypo name="chat" size={24} color={theme.colors.primary} />
          }
          title={t("lobby.chat")}
          isLoading={isChatLoading}
          badge={chatPreview?.unreadCount}
          subtitle={!lastMessage ? t("lobby.startChatting") : undefined}
          lastMessage={
            lastMessage
              ? {
                  text: lastMessage.text,
                  senderName: lastMessage.sender.username,
                  senderAvatar: lastMessage.sender.avatar,
                  timestamp: formatRelativeTime(lastMessage.createdAt),
                  isRead: lastMessage.isRead,
                }
              : undefined
          }
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
          customIcon={
            <Fontisto name="list-1" size={20} color={theme.colors.primary} />
          }
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
});
