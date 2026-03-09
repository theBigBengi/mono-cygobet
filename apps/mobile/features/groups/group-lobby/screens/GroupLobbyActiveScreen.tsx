// features/groups/group-lobby/screens/GroupLobbyActiveScreen.tsx
// Active state screen for group lobby - Clean & Minimal layout.

import React, { useMemo, useCallback, useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, NativeSyntheticEvent, NativeScrollEvent, Pressable, Text, Modal, TextInput, Platform, Keyboard, Dimensions, FlatList } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withRepeat, interpolate, SlideInDown, SlideOutDown, SlideOutUp, FadeIn, FadeOut, LinearTransition, runOnJS, type SharedValue } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
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
import { LobbyAboutSection } from "../components/LobbyAboutSection";
import { LobbyRecentResults } from "../components/LobbyRecentResults";
import { formatRelativeTime } from "@/utils/date";

// Debug screens — only loaded in development
const DebugCTAScreen = __DEV__ ? require("./DebugCTAScreen").DebugCTAScreen : null;
const DebugLeaderboardScreen = __DEV__ ? require("./DebugLeaderboardScreen").DebugLeaderboardScreen : null;
const DebugPredictionsOverviewScreen = __DEV__ ? require("./DebugPredictionsOverviewScreen").DebugPredictionsOverviewScreen : null;
const DebugSingleGameScreen = __DEV__ ? require("./DebugSingleGameScreen").DebugSingleGameScreen : null;
const DebugGroupCardScreen = __DEV__ ? require("../../group-list/screens/DebugGroupCardScreen").DebugGroupCardScreen : null;
const DebugSwipeCardScreen = __DEV__ ? require("./DebugSwipeCardScreen").DebugSwipeCardScreen : null;
const DebugGamesScreen = __DEV__ ? require("../../predictions/screens/DebugGamesScreen").DebugGamesScreen : null;

function formatChatTime(iso: string): string {
  return formatRelativeTime(iso);
}

interface GroupLobbyActiveScreenProps {
  group: ApiGroupItem;
  onRefresh: () => Promise<void>;
  isCreator: boolean;
  isLoading?: boolean;
  onSettingsPress?: () => void;
  onAvatarPress?: () => void;
  onScroll?: (scrollY: number) => void;
  onChatExpand?: () => void;
  onChatGestureStart?: () => void;
  onChatGestureCancel?: () => void;
  chatExpansion?: SharedValue<number>;
  onInvitePress?: () => void;
  onChatFocusChange?: (focused: boolean) => void;
}

export function GroupLobbyActiveScreen({
  group,
  onRefresh,
  isCreator,
  isLoading,
  onSettingsPress,
  onAvatarPress,
  onScroll,
  onChatExpand,
  onChatGestureStart,
  onChatGestureCancel,
  chatExpansion,
  onInvitePress,
  onChatFocusChange,
}: GroupLobbyActiveScreenProps) {
  const { t } = useTranslation("common");
  const { theme, colorScheme } = useTheme();
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

  const { data: rankingData, isLoading: isRankingLoading } =
    useGroupRankingQuery(group.id);
  const { data: chatPreviewData } = useGroupChatPreviewQuery();
  const chatPreview = chatPreviewData?.data?.[String(group.id)];
  const { data: unreadActivityData } = useUnreadActivityCountsQuery();
  const unreadActivityCount = unreadActivityData?.data?.[String(group.id)] ?? 0;

  // Floating chat bar
  const { sendMessage, messages: chatMessages } = useGroupChat(group.id);
  const [chatText, setChatText] = useState("");
  const [chatFocused, setChatFocused] = useState(false);
  const [chatPreviewDismissedId, setChatPreviewDismissedId] = useState<number | null>(null);
  const chatInputRef = useRef<TextInput>(null);
  const chatFocusKey = useRef(0);
  const unreadChatCount = chatPreview?.unreadCount ?? 0;
  const lastMessage = chatPreview?.lastMessage ?? null;

  // Optimistic sent message preview (single message, auto-dismisses)
  type PreviewMsg = { key: string; senderName: string; text: string; createdAt: string };
  const [sentPreview, setSentPreview] = useState<PreviewMsg | null>(null);

  const keyboardOffset = useSharedValue(0);
  const chatBarVisible = useSharedValue(1);
  const chatBarHidden = useRef(false);
  const lastScrollY = useRef(0);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      onScroll?.(y);
      if (!chatFocused) {
        const dy = y - lastScrollY.current;
        if (dy > 5 && !chatBarHidden.current) {
          chatBarHidden.current = true;
          chatBarVisible.value = withTiming(0, { duration: 400 });
        } else if (dy < -5 && chatBarHidden.current) {
          chatBarHidden.current = false;
          chatBarVisible.value = withTiming(1, { duration: 250 });
        }
      }
      lastScrollY.current = y;
    },
    [onScroll, chatFocused, chatBarVisible]
  );

  const dragY = useSharedValue(0);
  const chatBarEntrance = useSharedValue(0);
  const SCREEN_H = Dimensions.get("window").height;
  const BAR_H = 62 + Math.max(insets.bottom, 16);

  const floatingBarStyle = useAnimatedStyle(() => {
    const chatLift = chatExpansion
      ? interpolate(chatExpansion.value, [0, 1], [0, -(SCREEN_H - BAR_H * 2)])
      : 0;
    const slideIn = interpolate(chatBarEntrance.value, [0, 1], [BAR_H + 20, 0]);
    const scrollHide = interpolate(chatBarVisible.value, [0, 1], [BAR_H + 40, 0]);
    return {
      transform: [{ translateY: -keyboardOffset.value + dragY.value + chatLift + slideIn + scrollHide }],
      opacity: chatBarEntrance.value * chatBarVisible.value,
    };
  });

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const didShowSub = Keyboard.addListener("keyboardDidShow", () => {
      onChatFocusChange?.(true);
    });
    const showSub = Keyboard.addListener(showEvent, (e) => {
      keyboardOffset.value = withTiming(e.endCoordinates.height - insets.bottom + 8, { duration: Platform.OS === "ios" ? 250 : 0 });
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardOffset.value = withTiming(0, { duration: Platform.OS === "ios" ? 250 : 0 });
      // Sequenced exit: chat out first, then overlay
      setChatFocused(false);
      setSentPreview(null);
      setTimeout(() => {
        onChatFocusChange?.(false);
      }, 250);
    });
    return () => { showSub.remove(); hideSub.remove(); didShowSub.remove(); };
  }, [keyboardOffset, insets.bottom]);

  // Auto-dismiss sent preview after delay
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => { if (dismissTimer.current) clearTimeout(dismissTimer.current); };
  }, []);

  const handleChatSend = useCallback(() => {
    const trimmed = chatText.trim();
    if (!trimmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    sendMessage(trimmed);
    setChatText("");

    // Only show the preview bubble when the mini chat panel is not visible
    if (!chatFocused) {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);

      setSentPreview({
        key: `opt-${Date.now()}`,
        senderName: t("chat.you", { defaultValue: "You" }),
        text: trimmed,
        createdAt: new Date().toISOString(),
      });

      dismissTimer.current = setTimeout(() => {
        setSentPreview(null);
        dismissTimer.current = null;
      }, 4000);
    }
  }, [chatText, sendMessage, t]);

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

  // Slide chat bar in once lobby summary is loaded
  useEffect(() => {
    if (!isLobbySummaryLoading && !isRankingLoading) {
      chatBarEntrance.value = withTiming(1, { duration: 400 });
    }
  }, [isLobbySummaryLoading, isRankingLoading, chatBarEntrance]);

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
        router.push({ pathname: '/groups/[id]/games', params: { id: String(group.id), scrollToFixtureId: String(fixtureId) } });
      } else {
        router.push({ pathname: '/groups/[id]/games', params: { id: String(group.id) } });
      }
    },
    [router, group.id]
  );

  const handlePredictGame = useCallback(
    (fixtureId: number) => {
      router.push({ pathname: '/groups/[id]/fixtures/[fixtureId]', params: { id: String(group.id), fixtureId: String(fixtureId) } });
    },
    [router, group.id]
  );

  const handleViewRanking = useCallback(() => {
    router.push({ pathname: '/groups/[id]/ranking', params: { id: String(group.id) } });
  }, [router, group.id]);

  const handleViewInvite = useCallback(() => {
    onInvitePress?.();
  }, [onInvitePress]);

  const handleChatExpand = useCallback(() => {
    onChatExpand?.();
  }, [onChatExpand]);

  // Pan gesture to drag floating bar upward — drives chat expansion in real-time
  const MAX_DRAG = (Dimensions.get("window").height - (70 + Math.max(insets.bottom, 16))) * 0.6;
  const panGesture = useMemo(() =>
    Gesture.Pan()
      .enabled(!chatFocused)
      .activeOffsetY([-10, 10])
      .onStart(() => {
        if (onChatGestureStart) runOnJS(onChatGestureStart)();
      })
      .onUpdate((e) => {
        const progress = Math.min(1, Math.max(0, -e.translationY / MAX_DRAG));
        if (chatExpansion) chatExpansion.value = progress;
        // Move bar up slightly with finger
        dragY.value = Math.min(0, e.translationY) * 0.1;
      })
      .onEnd((e) => {
        const current = chatExpansion?.value ?? 0;
        const movingDown = e.velocityY > 300;
        const movingUp = e.velocityY < -300;
        const shouldOpen = movingUp || (!movingDown && current > 0.3);
        if (shouldOpen) {
          // Snap open
          if (chatExpansion) chatExpansion.value = withTiming(1, { duration: 200 });
          runOnJS(handleChatExpand)();
        } else {
          // Snap closed
          if (chatExpansion) chatExpansion.value = withTiming(0, { duration: 200 });
          if (onChatGestureCancel) runOnJS(onChatGestureCancel)();
        }
        dragY.value = withTiming(0, { duration: 200 });
      }),
    [chatFocused, handleChatExpand, onChatGestureStart, onChatGestureCancel, chatExpansion, MAX_DRAG]
  );

  const handleViewPredictionsOverview = useCallback(() => {
    router.push({ pathname: '/groups/[id]/predictions-overview', params: { id: String(group.id) } });
  }, [router, group.id]);

  const handleViewActivity = useCallback(() => {
    router.push({ pathname: '/groups/[id]/activity', params: { id: String(group.id) } });
  }, [router, group.id]);

  const renderMiniChatItem = useCallback(
    ({ item }: { item: (typeof chatMessages)[0] }) => {
      const isMe = item.senderId === user?.id;
      return (
        <View style={[styles.miniMsg, { backgroundColor: colorScheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }, isMe && [styles.miniMsgMe, { backgroundColor: theme.colors.primary }]]}>
          {!isMe && (
            <Text style={[styles.miniMsgSender, { color: theme.colors.primary }]}>
              {item.sender?.username ?? ""}
            </Text>
          )}
          <Text style={[styles.miniMsgBody, { color: theme.colors.textPrimary }, isMe && { color: theme.colors.textInverse }]} numberOfLines={2}>
            {item.body}
          </Text>
        </View>
      );
    },
    [user?.id, colorScheme, theme],
  );

  const handlePredictAll = useCallback(() => {
    // Find first upcoming unpredicted fixture
    const upcomingUnpredicted = fixtures.find(
      (f) => f.prediction?.home == null && f.prediction?.away == null && f.kickoffAt && new Date(f.kickoffAt).getTime() > Date.now()
    );
    const targetId = upcomingUnpredicted?.id ?? fixtures[0]?.id;
    if (targetId) {
      router.push({ pathname: '/groups/[id]/fixtures/[fixtureId]', params: { id: String(group.id), fixtureId: String(targetId) } });
    } else {
      handleViewGames();
    }
  }, [fixtures, router, group.id, handleViewGames]);

  const quickActions = useMemo(
    () => [
      {
        icon: "cards" as const,
        label: t("lobby.predictions"),
        onPress: handlePredictAll,
      },
    ],
    [
      t,
      handlePredictAll,
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
          description={group.description}
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
          onAvatarPress={onAvatarPress}
          isLoading={isRankingLoading}
        />

        {/* Meta row removed — chips shown on avatar in header */}

        <GroupTimelineBar
          startDate={group.firstGame?.kickoffAt ?? ""}
          endDate={group.lastGame?.kickoffAt ?? ""}
          progress={timelineProgress}
          isLoading={isRankingLoading}
        />

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
          onPredictPress={handlePredictGame}
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
          completedFixturesCount={lobbySummary?.completedFixturesCount ?? 0}
        />

        <LobbyActivityBanner
          groupId={group.id}
          unreadCount={unreadActivityCount}
          onPress={handleViewActivity}
        />

        <LobbyAboutSection group={group} />

        {__DEV__ && (
          <>
            {/* DEBUG buttons */}
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
          </>
        )}

      </Screen>

      {/* Floating chat bar */}
      <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.floatingBottom, { paddingBottom: Math.max(insets.bottom, 16) }, floatingBarStyle]}>
        {/* Sent message preview — floats above the bar */}
        {sentPreview && (
          <Animated.View
            key={sentPreview.key}
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(300)}
            style={[styles.chatPreviewFloat, { backgroundColor: theme.colors.cardBackground }]}
          >
            <Pressable onPress={handleChatExpand} style={styles.chatPreviewRow}>
              <Text style={[styles.chatPreviewSender, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                {sentPreview.senderName}
              </Text>
              <Text style={[styles.chatPreviewBody, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {sentPreview.text}
              </Text>
            </Pressable>
          </Animated.View>
        )}
        {/* Mini chat panel — visible when keyboard is open */}
        {chatFocused && (
          <Animated.View
            key={`mini-chat-${chatFocusKey.current}`}
            entering={FadeIn.duration(350).delay(100)}
            exiting={FadeOut.duration(150)}
            style={[styles.miniChatPanel, { backgroundColor: colorScheme === "dark" ? "#1E1E22" : "#FFFFFF", borderColor: theme.colors.border }]}
          >
            <View style={[styles.miniChatHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.miniChatTitle, { color: theme.colors.textPrimary }]}>
                {t("chat.title", { defaultValue: "Chat" })}
              </Text>
              <Pressable
                onPress={() => {
                  setChatFocused(false);
                  onChatFocusChange?.(false);
                  Keyboard.dismiss();
                  setTimeout(() => {
                    handleChatExpand();
                  }, 350);
                }}
                hitSlop={8}
                style={({ pressed }) => [styles.miniChatExpandBtn, pressed && { opacity: 0.6 }]}
              >
                <Ionicons name="expand-outline" size={18} color={theme.colors.textSecondary} />
              </Pressable>
            </View>
            <FlatList
              data={chatMessages.filter((m) => m.type === "user_message").slice(0, 8)}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderMiniChatItem}
              inverted
              style={styles.miniChatList}
              contentContainerStyle={styles.miniChatContent}
              showsVerticalScrollIndicator={false}
            />
          </Animated.View>
        )}
        <BlurView
          intensity={chatFocused ? 50 : 30}
          tint={colorScheme === "dark" ? "dark" : "light"}
          style={[styles.floatingBottomInner, { backgroundColor: colorScheme === "dark" ? (chatFocused ? "rgba(30,30,34,0.9)" : "rgba(40,40,44,0.75)") : (chatFocused ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.85)") }]}
        >
          {/* Input row */}
          <View style={styles.chatBarRow}>
            <View>
              <Ionicons name="chatbubbles-outline" size={20} color={chatFocused || unreadChatCount > 0 ? theme.colors.textPrimary : theme.colors.textSecondary} style={chatFocused || unreadChatCount > 0 ? undefined : { opacity: 0.5 }} />
              {unreadChatCount > 0 && (
                <View style={[styles.chatIconBadge, { backgroundColor: theme.colors.primary }]}>
                  <Text style={[styles.chatIconBadgeText, { color: theme.colors.textInverse }]}>{unreadChatCount > 9 ? "9+" : unreadChatCount}</Text>
                </View>
              )}
            </View>
            <TextInput
              ref={chatInputRef}
              style={[styles.chatInput, { backgroundColor: "transparent", color: theme.colors.textPrimary }]}
              placeholder={t("chat.typePlaceholder")}
              placeholderTextColor={chatFocused ? theme.colors.textSecondary : theme.colors.textSecondary + "80"}
              value={chatText}
              onChangeText={setChatText}
              onFocus={() => { chatFocusKey.current++; setChatFocused(true); }}
              onBlur={() => { setChatFocused(false); }}
              maxLength={2000}
            />
            {chatFocused ? (
              <Pressable
                onPress={handleChatSend}
                disabled={chatText.trim().length === 0}
                style={({ pressed }) => [
                  styles.chatActionBtn,
                  pressed && chatText.trim().length > 0 && { opacity: 0.8 },
                ]}
              >
                <Ionicons name="send" size={18} color={chatText.trim().length > 0 ? theme.colors.primary : theme.colors.textSecondary + "80"} />
              </Pressable>
            ) : (
              <Pressable onPress={handleChatExpand} style={({ pressed }) => [styles.chatActionBtn, pressed && { opacity: 0.7 }]}>
                <Ionicons name="chevron-expand-sharp" size={20} color={unreadChatCount > 0 ? theme.colors.textPrimary : theme.colors.textSecondary} style={unreadChatCount > 0 ? undefined : { opacity: 0.5 }} />
              </Pressable>
            )}
          </View>
        </BlurView>
      </Animated.View>
      </GestureDetector>

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
  metaIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    fontWeight: "500",
  },
  floatingBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  floatingBottomInner: {
    borderRadius: 14,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chatPreviewContainer: {
    marginBottom: 6,
    overflow: "hidden",
  },
  chatPreviewFloat: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
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
    // color set dynamically via theme.colors.textInverse
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
    // color set dynamically via theme.colors.textInverse
    fontSize: 11,
    fontWeight: "700",
  },
  miniChatPanel: {
    height: 300,
    borderRadius: 14,
    marginBottom: 6,
    overflow: "hidden",
  },
  miniChatBlur: {
    flex: 1,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  miniChatHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    // borderBottomColor set dynamically via theme.colors.border
  },
  miniChatTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  miniChatExpandBtn: {
    padding: 4,
  },
  miniChatList: {
    flex: 1,
  },
  miniChatContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  miniMsg: {
    alignSelf: "flex-start",
    maxWidth: "80%",
    // backgroundColor set dynamically via theme-aware logic
    borderRadius: 12,
    borderTopLeftRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  miniMsgMe: {
    alignSelf: "flex-end",
    // backgroundColor set dynamically via theme.colors.primary
    borderTopLeftRadius: 12,
    borderTopRightRadius: 4,
  },
  miniMsgSender: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 1,
  },
  miniMsgBody: {
    fontSize: 13,
    lineHeight: 17,
  },
});
