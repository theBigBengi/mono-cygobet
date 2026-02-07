// features/groups/group-lobby/screens/GroupLobbyActiveScreen.tsx
// Active state screen for group lobby - Clean & Minimal layout.

import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/ui";
import { useAuth } from "@/lib/auth/useAuth";
import {
  useGroupRankingQuery,
  useGroupChatPreviewQuery,
} from "@/domains/groups";
import type { ApiGroupItem } from "@repo/types";
import type { FixtureItem } from "../types";
import { GroupLobbyHeader } from "../components/GroupLobbyHeader";
import { LobbyPredictionsCTA } from "../components/LobbyPredictionsCTA";
import { LobbyQuickActions } from "../components/LobbyQuickActions";
import { LobbyLeaderboard } from "../components/LobbyLeaderboard";

interface GroupLobbyActiveScreenProps {
  group: ApiGroupItem;
  onRefresh: () => Promise<void>;
  isCreator: boolean;
}

export function GroupLobbyActiveScreen({
  group,
  onRefresh,
  isCreator,
}: GroupLobbyActiveScreenProps) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { user } = useAuth();
  const { data: rankingData, isLoading: isRankingLoading } =
    useGroupRankingQuery(group.id);
  const { data: chatPreviewData } = useGroupChatPreviewQuery();
  const chatPreview = chatPreviewData?.data?.[String(group.id)];

  const fixtures = Array.isArray((group as any).fixtures)
    ? ((group as any).fixtures as FixtureItem[])
    : [];

  const totalFixtures = group.totalFixtures ?? fixtures.length;
  const predictionsCount =
    group.predictionsCount ??
    fixtures.filter((f) => f.prediction != null && f.prediction !== undefined)
      .length;

  const now = new Date();
  const nextGame =
    fixtures.find(
      (f) =>
        f.prediction == null && new Date(f.kickoffAt).getTime() > now.getTime()
    ) ??
    fixtures.find((f) => new Date(f.kickoffAt).getTime() > now.getTime()) ??
    null;
  const nextGameForCTA =
    nextGame && nextGame.homeTeam && nextGame.awayTeam
      ? {
          homeTeam: {
            name: nextGame.homeTeam.name,
            imagePath: nextGame.homeTeam.imagePath ?? null,
          },
          awayTeam: {
            name: nextGame.awayTeam.name,
            imagePath: nextGame.awayTeam.imagePath ?? null,
          },
          kickoffAt: nextGame.kickoffAt,
        }
      : null;

  const ranking = rankingData?.data ?? [];

  const handleViewGames = () => {
    router.push(`/groups/${group.id}/games` as any);
  };

  const handleViewRanking = () => {
    router.push(`/groups/${group.id}/ranking` as any);
  };

  const handleViewInvite = () => {
    router.push(`/groups/${group.id}/invite` as any);
  };

  const handleViewChat = () => {
    router.push(`/groups/${group.id}/chat` as any);
  };

  const handleViewPredictionsOverview = () => {
    router.push(`/groups/${group.id}/predictions-overview` as any);
  };

  const quickActions = [
    {
      icon: "chat" as const,
      label: t("lobby.chat"),
      badge: chatPreview?.unreadCount,
      onPress: handleViewChat,
    },
    ...(group.inviteAccess !== "admin_only" || isCreator
      ? [
          {
            icon: "link" as const,
            label: t("lobby.invite"),
            onPress: handleViewInvite,
          },
        ]
      : []),
    {
      icon: "stats" as const,
      label: t("lobby.stats"),
      onPress: handleViewPredictionsOverview,
    },
  ];

  return (
    <View style={styles.container}>
      <Screen
        contentContainerStyle={styles.screenContent}
        onRefresh={onRefresh}
        scroll
      >
        <GroupLobbyHeader
          name={group.name}
          memberCount={group.memberCount}
          status="active"
          compact
        />

        <LobbyPredictionsCTA
          predictionsCount={predictionsCount}
          totalFixtures={totalFixtures}
          onPress={handleViewGames}
          nextGame={nextGameForCTA}
        />

        <LobbyQuickActions actions={quickActions} />

        <LobbyLeaderboard
          ranking={ranking}
          currentUserId={user?.id ?? null}
          isLoading={isRankingLoading}
          onPress={handleViewRanking}
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
