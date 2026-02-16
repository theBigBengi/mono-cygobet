// features/groups/group-lobby/screens/GroupLobbyActiveScreen.tsx
// Active state screen for group lobby - Clean & Minimal layout.

import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Screen } from "@/components/ui";
import { useAuth } from "@/lib/auth/useAuth";
import { useGoBack } from "@/hooks/useGoBack";
import {
  useGroupRankingQuery,
  useGroupChatPreviewQuery,
} from "@/domains/groups";
import type { ApiGroupItem } from "@repo/types";
import type { FixtureItem } from "../types";
import { GroupLobbyHeader } from "../components/GroupLobbyHeader";
import { GroupTimelineBar } from "../components/GroupTimelineBar";
import { LobbyPredictionsCTA } from "../components/LobbyPredictionsCTA";
import { LobbyQuickActions } from "../components/LobbyQuickActions";
import { LobbyLeaderboard } from "../components/LobbyLeaderboard";
import { GroupInfoSheet } from "../components/GroupInfoSheet";
import { useGroupDuration } from "../hooks/useGroupDuration";

interface GroupLobbyActiveScreenProps {
  group: ApiGroupItem;
  onRefresh: () => Promise<void>;
  isCreator: boolean;
  isLoading?: boolean;
}

export function GroupLobbyActiveScreen({
  group,
  onRefresh,
  isCreator,
  isLoading,
}: GroupLobbyActiveScreenProps) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { user } = useAuth();
  const goBack = useGoBack("/(tabs)/groups");
  const infoSheetRef = useRef<React.ComponentRef<typeof BottomSheetModal>>(null);
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

  const fixturesLoaded = fixtures.length > 0 || totalFixtures === 0;
  const now = new Date();
  const ranking = rankingData?.data ?? [];

  // Timeline progress calculation
  const duration = useGroupDuration(fixtures);
  const timelineProgress = React.useMemo(() => {
    if (!duration) return 0;
    const startTime = new Date(duration.startDate).getTime();
    const endTime = new Date(duration.endDate).getTime();
    const nowTime = now.getTime();
    if (endTime <= startTime) return 1;
    return (nowTime - startTime) / (endTime - startTime);
  }, [duration, now]);

  const handleViewGames = (fixtureId?: number) => {
    if (fixtureId != null) {
      router.push(`/groups/${group.id}/games?scrollToFixtureId=${fixtureId}` as any);
    } else {
      router.push(`/groups/${group.id}/games` as any);
    }
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
          privacy={group.privacy}
          compact
          onBack={goBack}
          onInfoPress={() => infoSheetRef.current?.present()}
        />

        {duration && (
          <GroupTimelineBar
            startDate={duration.startDate}
            endDate={duration.endDate}
            progress={timelineProgress}
          />
        )}

        <LobbyQuickActions actions={quickActions} />

        <LobbyPredictionsCTA
          predictionsCount={predictionsCount}
          totalFixtures={totalFixtures}
          onPress={handleViewGames}
          fixtures={fixtures}
          isLoading={!fixturesLoaded}
          winnerName={ranking[0]?.username}
          winnerPoints={ranking[0]?.totalPoints}
          onWinnerPress={handleViewRanking}
        />

        <LobbyLeaderboard
          ranking={ranking}
          currentUserId={user?.id ?? null}
          isLoading={isRankingLoading}
          onPress={handleViewRanking}
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
});
