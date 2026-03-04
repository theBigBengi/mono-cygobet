// features/groups/group-lobby/screens/GroupLobbyActiveScreen.tsx
// Active state screen for group lobby - Clean & Minimal layout.

import React, { useMemo, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, NativeSyntheticEvent, NativeScrollEvent, Pressable, Text, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth/useAuth";
import {
  useGroupRankingQuery,
  useGroupChatPreviewQuery,
  useUnreadActivityCountsQuery,
  useGroupLobbySummaryQuery,
  groupsKeys,
} from "@/domains/groups";
import type { ApiGroupItem } from "@repo/types";
import type { FixtureItem } from "../types";
import { GroupLobbyHeader } from "../components/GroupLobbyHeader";
import { GroupTimelineBar } from "../components/GroupTimelineBar";
import { LobbyPredictionsCTA } from "../components/LobbyPredictionsCTA";
import { LobbyQuickActions } from "../components/LobbyQuickActions";
import { LobbyLeaderboard } from "../components/LobbyLeaderboard";
import { LobbyActivityBanner } from "../components/LobbyActivityBanner";
import { DebugCTAScreen } from "./DebugCTAScreen";
import { DebugLeaderboardScreen } from "./DebugLeaderboardScreen";
import { DebugPredictionsOverviewScreen } from "./DebugPredictionsOverviewScreen";
import { DebugSingleGameScreen } from "./DebugSingleGameScreen";
import { DebugGroupCardScreen } from "../../group-list/screens/DebugGroupCardScreen";
import { DebugSwipeCardScreen } from "./DebugSwipeCardScreen";

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
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [showDebugCTA, setShowDebugCTA] = useState(false);
  const [showDebugLeaderboard, setShowDebugLeaderboard] = useState(false);
  const [showDebugOverview, setShowDebugOverview] = useState(false);
  const [showDebugSingleGame, setShowDebugSingleGame] = useState(false);
  const [showDebugGroupCard, setShowDebugGroupCard] = useState(false);
  const [showDebugSwipeCard, setShowDebugSwipeCard] = useState(false);

  // Invalidate lobby summary when screen gains focus (e.g. returning from games screen after saving predictions)
  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: groupsKeys.lobbySummary(group.id) });
    }, [queryClient, group.id])
  );

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

  // Lobby summary — lightweight fixture slices for CTA
  const { data: lobbySummaryData, isLoading: isLobbySummaryLoading } =
    useGroupLobbySummaryQuery(group.id);
  const lobbySummary = lobbySummaryData?.data;

  // Combine lobby summary slices into a flat array for the CTA component
  const fixtures: FixtureItem[] = useMemo(() => {
    if (!lobbySummary) return [];
    return [
      ...lobbySummary.liveFixtures,
      ...lobbySummary.upcomingFixtures,
      ...lobbySummary.recentFinishedFixtures,
    ];
  }, [lobbySummary]);

  const totalFixtures = lobbySummary?.totalFixtures ?? group.totalFixtures ?? 0;
  const predictionsCount = lobbySummary?.predictionsCount ?? group.predictionsCount ?? 0;

  const fixturesLoaded = !isLobbySummaryLoading;
  const ranking = rankingData?.data ?? [];

  // Timeline progress calculation — use group.firstGame/lastGame (no full fixtures needed)
  const timelineProgress = useMemo(() => {
    if (!group.firstGame || !group.lastGame) return 0;
    const startTime = new Date(group.firstGame.kickoffAt).getTime();
    const endTime = new Date(group.lastGame.kickoffAt).getTime();
    const nowTime = Date.now();
    if (endTime <= startTime) return 1;
    return (nowTime - startTime) / (endTime - startTime);
  }, [group.firstGame, group.lastGame]);

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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Screen
        contentContainerStyle={styles.screenContent}
        onRefresh={onRefresh}
        onScroll={handleScroll}
        scroll
        extendIntoStatusBar
      >
        {/* Spacer: pushes content below sticky header (status bar + some padding) */}
        <View style={{ height: insets.top + 70 }} />

        <GroupLobbyHeader
          name={group.name}
          memberCount={group.memberCount}
          status="active"
          privacy={group.privacy}
          avatarType={group.avatarType}
          avatarValue={group.avatarValue}
          isOfficial={group.isOfficial}
          compact
          hideNavButtons
          onInfoPress={onInfoPress}
        />

        {group.firstGame && group.lastGame ? (
          <GroupTimelineBar
            startDate={group.firstGame.kickoffAt}
            endDate={group.lastGame.kickoffAt}
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

        {/* DEBUG — remove after done */}
        <View style={{ flexDirection: "row", gap: 8, marginHorizontal: 16, marginTop: 12 }}>
          <Pressable
            onPress={() => setShowDebugCTA(true)}
            style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: "#EF4444", alignItems: "center" }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>DEBUG CTA</Text>
          </Pressable>
          <Pressable
            onPress={() => setShowDebugLeaderboard(true)}
            style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: "#8B5CF6", alignItems: "center" }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>DEBUG LEADERBOARD</Text>
          </Pressable>
          <Pressable
            onPress={() => setShowDebugOverview(true)}
            style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: "#10B981", alignItems: "center" }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>DEBUG TABLE</Text>
          </Pressable>
          <Pressable
            onPress={() => setShowDebugSingleGame(true)}
            style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: "#F59E0B", alignItems: "center" }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>DEBUG GAME</Text>
          </Pressable>
          <Pressable
            onPress={() => setShowDebugGroupCard(true)}
            style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: "#3B82F6", alignItems: "center" }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>DEBUG CARD</Text>
          </Pressable>
          <Pressable
            onPress={() => setShowDebugSwipeCard(true)}
            style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: "#EC4899", alignItems: "center" }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>SWIPE CARD</Text>
          </Pressable>
        </View>

        <Modal visible={showDebugCTA} animationType="slide" presentationStyle="fullScreen">
          <DebugCTAScreen />
          <Pressable
            onPress={() => setShowDebugCTA(false)}
            style={{ position: "absolute", top: 60, right: 16, padding: 8, borderRadius: 8, backgroundColor: "#00000066", zIndex: 10 }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>X</Text>
          </Pressable>
        </Modal>

        <Modal visible={showDebugLeaderboard} animationType="slide" presentationStyle="fullScreen">
          <DebugLeaderboardScreen />
          <Pressable
            onPress={() => setShowDebugLeaderboard(false)}
            style={{ position: "absolute", top: 60, right: 16, padding: 8, borderRadius: 8, backgroundColor: "#00000066", zIndex: 10 }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>X</Text>
          </Pressable>
        </Modal>

        <Modal visible={showDebugOverview} animationType="slide" presentationStyle="fullScreen">
          <DebugPredictionsOverviewScreen />
          <Pressable
            onPress={() => setShowDebugOverview(false)}
            style={{ position: "absolute", bottom: 40, alignSelf: "center", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8, backgroundColor: "#00000066", zIndex: 10 }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>X</Text>
          </Pressable>
        </Modal>

        <Modal visible={showDebugSingleGame} animationType="slide" presentationStyle="fullScreen">
          <DebugSingleGameScreen />
          <Pressable
            onPress={() => setShowDebugSingleGame(false)}
            style={{ position: "absolute", top: 60, right: 16, padding: 8, borderRadius: 8, backgroundColor: "#00000066", zIndex: 10 }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>X</Text>
          </Pressable>
        </Modal>

        <Modal visible={showDebugGroupCard} animationType="slide" presentationStyle="fullScreen">
          <DebugGroupCardScreen />
          <Pressable
            onPress={() => setShowDebugGroupCard(false)}
            style={{ position: "absolute", top: 60, right: 16, padding: 8, borderRadius: 8, backgroundColor: "#00000066", zIndex: 10 }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>X</Text>
          </Pressable>
        </Modal>

        <Modal visible={showDebugSwipeCard} animationType="slide" presentationStyle="fullScreen">
          <DebugSwipeCardScreen />
          <Pressable
            onPress={() => setShowDebugSwipeCard(false)}
            style={{ position: "absolute", top: 60, right: 16, padding: 8, borderRadius: 8, backgroundColor: "#00000066", zIndex: 10 }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>X</Text>
          </Pressable>
        </Modal>
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
