// features/groups/group-lobby/screens/GroupLobbyActiveScreen.tsx
// Active state screen for group lobby - Clean & Minimal layout.

import React, { useMemo, useCallback, useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, NativeSyntheticEvent, NativeScrollEvent, Pressable, Text, Modal, TextInput, Platform, Keyboard } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, SlideInDown, SlideOutUp, FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Screen } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth/useAuth";
import {
  useGroupRankingQuery,
  useGroupChatPreviewQuery,
  useUnreadActivityCountsQuery,
  useGroupLobbySummaryQuery,
  useGroupChat,
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
import { LobbyRecentResults } from "../components/LobbyRecentResults";
import { DebugCTAScreen } from "./DebugCTAScreen";
import { DebugLeaderboardScreen } from "./DebugLeaderboardScreen";
import { DebugPredictionsOverviewScreen } from "./DebugPredictionsOverviewScreen";
import { DebugSingleGameScreen } from "./DebugSingleGameScreen";
import { DebugGroupCardScreen } from "../../group-list/screens/DebugGroupCardScreen";
import { DebugSwipeCardScreen } from "./DebugSwipeCardScreen";
import { DebugGamesScreen } from "../../predictions/screens/DebugGamesScreen";

function formatChatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

interface GroupLobbyActiveScreenProps {
  group: ApiGroupItem;
  onRefresh: () => Promise<void>;
  isCreator: boolean;
  isLoading?: boolean;
  onSettingsPress?: () => void;
  onInfoPress?: () => void;
  onScroll?: (scrollY: number) => void;
  onChatPress?: () => void;
}

export function GroupLobbyActiveScreen({
  group,
  onRefresh,
  isCreator,
  isLoading,
  onSettingsPress,
  onInfoPress,
  onScroll,
  onChatPress,
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
  const [showDebugGames, setShowDebugGames] = useState(false);

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

  // Floating chat bar
  const { sendMessage } = useGroupChat(group.id);
  const [chatText, setChatText] = useState("");
  const [chatFocused, setChatFocused] = useState(false);
  const [chatPreviewDismissedId, setChatPreviewDismissedId] = useState<number | null>(null);
  const chatInputRef = useRef<TextInput>(null);
  const unreadChatCount = chatPreview?.unreadCount ?? 0;
  const lastMessage = chatPreview?.lastMessage ?? null;

  // Optimistic sent messages for preview animation
  type PreviewMsg = { key: string; senderName: string; text: string; createdAt: string };
  const [sentPreviewMessages, setSentPreviewMessages] = useState<PreviewMsg[]>([]);

  const keyboardOffset = useSharedValue(0);
  const floatingBarStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -keyboardOffset.value }],
  }));

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (e) => {
      keyboardOffset.value = withTiming(e.endCoordinates.height - insets.bottom, { duration: Platform.OS === "ios" ? 250 : 0 });
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardOffset.value = withTiming(0, { duration: Platform.OS === "ios" ? 250 : 0 });
      setSentPreviewMessages([]);
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, [keyboardOffset, insets.bottom]);

  const handleChatSend = useCallback(() => {
    const trimmed = chatText.trim();
    if (!trimmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    sendMessage(trimmed);
    setChatText("");

    const newMsg: PreviewMsg = {
      key: `opt-${Date.now()}`,
      senderName: t("chat.you", { defaultValue: "You" }),
      text: trimmed,
      createdAt: new Date().toISOString(),
    };
    setSentPreviewMessages(prev => {
      if (prev.length === 0 && lastMessage) {
        return [
          { key: `last-${lastMessage.id}`, senderName: lastMessage.sender.username, text: lastMessage.text, createdAt: lastMessage.createdAt },
          newMsg,
        ];
      }
      return [...prev.slice(-1), newMsg];
    });
  }, [chatText, sendMessage, user, lastMessage]);

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

  // Skeleton pulse for MetaRow
  const metaSkeletonOpacity = useSharedValue(0.3);
  useEffect(() => {
    if (isLobbySummaryLoading) {
      metaSkeletonOpacity.value = withRepeat(
        withTiming(1, { duration: 800 }),
        -1,
        true
      );
    }
  }, [isLobbySummaryLoading, metaSkeletonOpacity]);
  const metaSkeletonStyle = useAnimatedStyle(() => ({
    opacity: metaSkeletonOpacity.value,
  }));

  const ranking = rankingData?.data ?? [];

  const creatorName = useMemo(() => {
    const creator = ranking.find((r) => r.userId === group.creatorId);
    return creator?.username ?? null;
  }, [ranking, group.creatorId]);

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
    onChatPress?.();
  }, [onChatPress]);

  const handleViewPredictionsOverview = useCallback(() => {
    router.push(`/groups/${group.id}/predictions-overview` as any);
  }, [router, group.id]);

  const handleViewActivity = useCallback(() => {
    router.push(`/groups/${group.id}/activity` as any);
  }, [router, group.id]);

  const quickActions = useMemo(
    () => [
      {
        icon: "cards" as const,
        label: t("lobby.predictions"),
        onPress: () => handleViewGames(),
      },
    ],
    [
      t,
      handleViewGames,
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
        <View style={{ height: insets.top + 50 }} />

        <GroupLobbyHeader
          name={group.name}
          memberCount={group.memberCount}
          status="active"
          privacy={group.privacy}
          avatarType={group.avatarType}
          avatarValue={group.avatarValue}
          isOfficial={group.isOfficial}
          creatorName={creatorName}
          onSharePress={group.inviteAccess !== "admin_only" || isCreator ? handleViewInvite : undefined}
          compact
          hideNavButtons
          onInfoPress={onInfoPress}
          isLoading={isRankingLoading}
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

        <View style={styles.metaRow}>
          {isLobbySummaryLoading ? (
            <Animated.View
              style={[
                { width: 180, height: 13, borderRadius: 6, backgroundColor: theme.colors.border },
                metaSkeletonStyle,
              ]}
            />
          ) : (
            <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
              {[
                t("lobby.active"),
                group.memberCount != null ? `${group.memberCount} ${t("groups.membersShort", { defaultValue: "members" })}` : null,
                group.privacy === "private" ? t("groups.private", { defaultValue: "Private" }) : group.privacy === "public" ? t("groups.public", { defaultValue: "Public" }) : null,
              ].filter(Boolean).join("  ·  ")}
            </Text>
          )}
        </View>

        <LobbyQuickActions
          actions={quickActions}
          predictionsCount={predictionsCount}
          totalFixtures={totalFixtures}
          isLoading={isLobbySummaryLoading}
        />

        <LobbyPredictionsCTA
          predictionsCount={predictionsCount}
          totalFixtures={totalFixtures}
          onPress={handleViewGames}
          fixtures={fixtures}
          isLoading={!fixturesLoaded}
          completedFixturesCount={lobbySummary?.completedFixturesCount ?? group.completedFixturesCount ?? 0}
        />

        <LobbyLeaderboard
          ranking={ranking}
          currentUserId={user?.id ?? null}
          isLoading={isRankingLoading}
          onPress={handleViewRanking}
          memberCount={group.memberCount}
        />

        <LobbyRecentResults
          fixtures={lobbySummary?.recentFinishedFixtures ?? []}
          onPress={handleViewPredictionsOverview}
          isLoading={isLobbySummaryLoading}
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
          <Pressable
            onPress={() => setShowDebugGames(true)}
            style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: "#14B8A6", alignItems: "center" }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>GAMES</Text>
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

        <Modal visible={showDebugGames} animationType="slide" presentationStyle="fullScreen">
          <DebugGamesScreen />
          <Pressable
            onPress={() => setShowDebugGames(false)}
            style={{ position: "absolute", top: 60, right: 16, padding: 8, borderRadius: 8, backgroundColor: "#00000066", zIndex: 10 }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>X</Text>
          </Pressable>
        </Modal>
      </Screen>

      {/* Floating chat bar */}
      <Animated.View style={[styles.floatingBottom, { paddingBottom: Math.max(insets.bottom, 16) }, floatingBarStyle]}>
        <View style={[styles.floatingBottomInner, { backgroundColor: theme.colors.cardBackground }]}>
          {/* Preview messages */}
          {!(lastMessage && chatPreviewDismissedId === lastMessage.id) && (() => {
            const msgs = sentPreviewMessages.length > 0
              ? sentPreviewMessages
              : lastMessage
                ? [{ key: `last-${lastMessage.id}`, senderName: lastMessage.sender.id === user?.id ? t("chat.you", { defaultValue: "You" }) : lastMessage.sender.username, text: lastMessage.text, createdAt: lastMessage.createdAt }]
                : [];
            if (msgs.length === 0) return null;
            return (
              <Animated.View layout={LinearTransition.duration(250)} style={styles.chatPreviewContainer}>
                {msgs.map((msg) => (
                  <Animated.View
                    key={msg.key}
                    entering={SlideInDown.duration(250)}
                    exiting={SlideOutUp.duration(200)}
                    layout={LinearTransition.duration(250)}
                  >
                    <Pressable onPress={handleViewChat} style={[styles.chatPreviewRow, sentPreviewMessages.length === 0 && { paddingRight: 22 }]}>
                      <Text style={[styles.chatPreviewSender, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                        {msg.senderName}
                      </Text>
                      <Text style={[styles.chatPreviewBody, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {msg.text}
                      </Text>
                      <Text style={[styles.chatPreviewTime, { color: theme.colors.textSecondary }]}>
                        {formatChatTime(msg.createdAt)}
                      </Text>
                    </Pressable>
                  </Animated.View>
                ))}
                {sentPreviewMessages.length === 0 && (
                  <Pressable onPress={() => setChatPreviewDismissedId(lastMessage?.id ?? null)} style={styles.chatPreviewClose} hitSlop={8}>
                    <Ionicons name="close" size={14} color={theme.colors.textSecondary} />
                  </Pressable>
                )}
              </Animated.View>
            );
          })()}
          {/* Input row */}
          <Animated.View layout={LinearTransition.duration(250)} style={styles.chatBarRow}>
            <View>
              <Ionicons name="chatbubbles-outline" size={20} color={theme.colors.textPrimary} />
              {unreadChatCount > 0 && (
                <View style={[styles.chatIconBadge, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.chatIconBadgeText}>{unreadChatCount > 9 ? "9+" : unreadChatCount}</Text>
                </View>
              )}
            </View>
            <TextInput
              ref={chatInputRef}
              style={[styles.chatInput, { backgroundColor: theme.colors.background, color: theme.colors.textPrimary }]}
              placeholder={t("chat.typePlaceholder")}
              placeholderTextColor={theme.colors.textSecondary}
              value={chatText}
              onChangeText={setChatText}
              onFocus={() => setChatFocused(true)}
              onBlur={() => setChatFocused(false)}
              maxLength={2000}
            />
            {chatFocused ? (
              <Pressable
                onPress={handleChatSend}
                disabled={chatText.trim().length === 0}
                style={({ pressed }) => [
                  styles.chatActionBtn,
                  {
                    backgroundColor: chatText.trim().length > 0 ? theme.colors.primary : theme.colors.background,
                  },
                  pressed && chatText.trim().length > 0 && { opacity: 0.8 },
                ]}
              >
                <Ionicons name="send" size={18} color={chatText.trim().length > 0 ? "#fff" : theme.colors.textSecondary} />
              </Pressable>
            ) : (
              <Pressable onPress={handleViewChat} style={({ pressed }) => [styles.chatActionBtn, pressed && { opacity: 0.7 }]}>
                <Ionicons name="chevron-up" size={20} color={theme.colors.textSecondary} />
              </Pressable>
            )}
          </Animated.View>
        </View>
      </Animated.View>

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
  metaRow: {
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 13,
    fontWeight: "400",
  },
  floatingBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  floatingBottomInner: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  chatPreviewContainer: {
    marginBottom: 6,
    overflow: "hidden",
  },
  chatPreviewLine: {},
  chatPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 3,
  },
  chatPreviewClose: {
    position: "absolute",
    top: 3,
    right: 0,
  },
  chatPreviewSender: {
    fontSize: 12,
    fontWeight: "700",
  },
  chatPreviewBody: {
    fontSize: 13,
    flex: 1,
  },
  chatPreviewTime: {
    fontSize: 11,
  },
  chatBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chatInput: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  chatActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  chatIconBadge: {
    position: "absolute",
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  chatIconBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
  chatBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  chatBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
});
