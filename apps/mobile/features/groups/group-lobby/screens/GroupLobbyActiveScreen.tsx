// features/groups/group-lobby/screens/GroupLobbyActiveScreen.tsx
// Active state screen for group lobby - Clean & Minimal layout.

import React, { useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Screen } from "@/components/ui";
import { useAuth } from "@/lib/auth/useAuth";
import {
  useGroupRankingQuery,
  useGroupChatPreviewQuery,
  useUnreadActivityCountsQuery,
} from "@/domains/groups";
import type { ApiGroupItem } from "@repo/types";
import type { FixtureItem } from "../types";
import { GroupLobbyHeader } from "../components/GroupLobbyHeader";
import { GroupTimelineBar } from "../components/GroupTimelineBar";
import { LobbyPredictionsCTA } from "../components/LobbyPredictionsCTA";
import { LobbyQuickActions } from "../components/LobbyQuickActions";
import { LobbyLeaderboard } from "../components/LobbyLeaderboard";
import { LobbyActivityBanner } from "../components/LobbyActivityBanner";
import { useGroupDuration } from "../hooks/useGroupDuration";

interface GroupLobbyActiveScreenProps {
  group: ApiGroupItem;
  onRefresh: () => Promise<void>;
  isCreator: boolean;
  isLoading?: boolean;
  onSettingsPress?: () => void;
  onInfoPress?: () => void;
  onScroll?: (scrollY: number) => void;
}

export function GroupLobbyActiveScreen({
  group,
  onRefresh,
  isCreator,
  isLoading,
  onSettingsPress,
  onInfoPress,
  onScroll,
}: GroupLobbyActiveScreenProps) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      onScroll?.(event.nativeEvent.contentOffset.y);
    },
    [onScroll]
  );
  const { data: rankingData, isLoading: isRankingLoading } =
    useGroupRankingQuery(group.id);
  const { data: chatPreviewData } = useGroupChatPreviewQuery();
  const chatPreview = chatPreviewData?.data?.[String(group.id)];
  const { data: unreadActivityData } = useUnreadActivityCountsQuery();
  const unreadActivityCount = unreadActivityData?.data?.[String(group.id)] ?? 0;

  const fixtures: FixtureItem[] = group.fixtures ?? [];

  const totalFixtures = group.totalFixtures ?? fixtures.length;
  const predictionsCount =
    group.predictionsCount ??
    fixtures.filter((f) => f.prediction != null && f.prediction !== undefined)
      .length;

  const fixturesLoaded = fixtures.length > 0 || group.totalFixtures === 0;
  const ranking = rankingData?.data ?? [];

  // Timeline progress calculation
  const duration = useGroupDuration(fixtures);
  const timelineProgress = useMemo(() => {
    if (!duration) return 0;
    const startTime = new Date(duration.startDate).getTime();
    const endTime = new Date(duration.endDate).getTime();
    const nowTime = Date.now();
    if (endTime <= startTime) return 1;
    return (nowTime - startTime) / (endTime - startTime);
  }, [duration]);

  const handleViewGames = useCallback(
    (fixtureId?: number) => {
      if (fixtureId != null) {
        router.push(`/groups/${group.id}/games?scrollToFixtureId=${fixtureId}` as any);
      } else {
        router.push(`/groups/${group.id}/games` as any);
      }
    },
    [router, group.id]
  );

  const handleViewRanking = useCallback(() => {
    router.push(`/groups/${group.id}/ranking` as any);
  }, [router, group.id]);

  const handleViewInvite = useCallback(() => {
    router.push(`/groups/${group.id}/invite` as any);
  }, [router, group.id]);

  const handleViewChat = useCallback(() => {
    router.push(`/groups/${group.id}/chat` as any);
  }, [router, group.id]);

  const handleViewPredictionsOverview = useCallback(() => {
    router.push(`/groups/${group.id}/predictions-overview` as any);
  }, [router, group.id]);

  const handleViewActivity = useCallback(() => {
    router.push(`/groups/${group.id}/activity` as any);
  }, [router, group.id]);

  const quickActions = useMemo(
    () => [
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
    ],
    [
      t,
      chatPreview?.unreadCount,
      isCreator,
      group.inviteAccess,
      handleViewChat,
      handleViewInvite,
      handleViewPredictionsOverview,
    ]
  );

  return (
    <View style={styles.container}>
      <Screen
        contentContainerStyle={styles.screenContent}
        onRefresh={onRefresh}
        onScroll={handleScroll}
        scroll
        extendIntoStatusBar
      >
        {/* Spacer: pushes content below sticky header (status bar + some padding) */}
        <View style={{ height: insets.top + 8 }} />

        <GroupLobbyHeader
          name={group.name}
          memberCount={group.memberCount}
          status="active"
          privacy={group.privacy}
          compact
          hideNavButtons
          onInfoPress={onInfoPress}
        />

        {duration ? (
          <GroupTimelineBar
            startDate={duration.startDate}
            endDate={duration.endDate}
            progress={timelineProgress}
          />
        ) : (
          <GroupTimelineBar
            startDate=""
            endDate=""
            progress={0}
            isLoading
          />
        )}

        <LobbyQuickActions actions={quickActions} />

        <LobbyPredictionsCTA
          predictionsCount={predictionsCount}
          totalFixtures={totalFixtures}
          onPress={handleViewGames}
          fixtures={fixtures}
          isLoading={!fixturesLoaded}
        />

        <LobbyLeaderboard
          ranking={ranking}
          currentUserId={user?.id ?? null}
          isLoading={isRankingLoading}
          onPress={handleViewRanking}
          memberCount={group.memberCount}
        />

        <LobbyActivityBanner
          groupId={group.id}
          unreadCount={unreadActivityCount}
          onPress={handleViewActivity}
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
    // paddingBottom handled by Screen component (includes insets.bottom + tab bar)
  },
});
