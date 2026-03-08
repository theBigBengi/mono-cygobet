// app/groups/[id]/index.tsx
// Group lobby screen.
// Routes to appropriate screen based on group status.
// - Active status → GroupLobbyActiveScreen
// - Ended status → GroupLobbyEndedScreen

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSetAtom } from "jotai";
import {
  View,
  StyleSheet,
  Pressable,
  Keyboard,
  useWindowDimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  runOnJS,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Screen, AppText } from "@/components/ui";
import { AnimatedStickyHeader } from "@/components/ui/AnimatedStickyHeader";
import { useQueryClient } from "@tanstack/react-query";
import { useGroupQuery, useUpdateGroupMutation, groupsKeys } from "@/domains/groups";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import { ApiError } from "@/lib/http/apiError";
import { useAuth } from "@/lib/auth/useAuth";
import { useTheme } from "@/lib/theme";
import { globalBlockingOverlayAtom } from "@/lib/state/globalOverlay.atom";
import { activeGroupIdAtom } from "@/lib/state/activeGroup.atom";
import {
  GroupLobbyActiveScreen,
  GroupLobbyEndedScreen,
  LobbyWithHeader,
  GroupInfoSheet,
  GroupEditSheet,
} from "@/features/groups/group-lobby";
import { GroupChatScreen } from "@/features/groups/chat";
import { GroupInviteSheet } from "@/features/groups/invite";
import { ErrorBoundary } from "@/components/ErrorBoundary";

/**
 * Group Lobby Screen
 *
 * Main screen component for viewing and managing group lobby.
 * Handles data fetching, error states, and routes to appropriate screen based on status.
 */

export default function GroupLobbyScreen() {
  return (
    <ErrorBoundary feature="group-lobby">
      <GroupLobbyContent />
    </ErrorBoundary>
  );
}

function GroupLobbyContent() {
  const { t } = useTranslation("common");
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { theme, colorScheme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const setOverlay = useSetAtom(globalBlockingOverlayAtom);
  const [chatFocused, setChatFocused] = useState(false);
  const chatFocusKey = useRef(0);
  const handleChatFocusChange = useCallback((focused: boolean) => {
    if (focused) chatFocusKey.current++;
    setChatFocused(focused);
  }, []);
  const setActiveGroup = useSetAtom(activeGroupIdAtom);
  const groupId =
    params.id && !isNaN(Number(params.id)) ? Number(params.id) : null;

  // Track active group for toast suppression
  useEffect(() => {
    setActiveGroup(groupId);
    return () => setActiveGroup(null);
  }, [groupId, setActiveGroup]);

  // Scroll tracking for sticky header (using reanimated shared value)
  const scrollY = useSharedValue(0);
  const handleScroll = useCallback((y: number) => {
    scrollY.value = y;
  }, []);

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch: refetchGroup,
  } = useGroupQuery(groupId);

  // Dismiss creation overlay once group data is loaded
  useEffect(() => {
    if (!data) return;
    const timer = setTimeout(() => setOverlay(false), 300);
    return () => clearTimeout(timer);
  }, [data, setOverlay]);

  // Fallback: force dismiss overlay after 8s (safety net)
  useEffect(() => {
    const fallback = setTimeout(() => setOverlay(false), 8000);
    return () => clearTimeout(fallback);
  }, [setOverlay]);

  // Navigate back to groups screen only if group is genuinely not found (404/403)
  const isNotFoundError =
    error instanceof ApiError && (error.status === 404 || error.status === 403);
  useEffect(() => {
    if (isNotFoundError || (!isLoading && !error && !data)) {
      router.replace("/(tabs)/groups");
    }
  }, [isNotFoundError, data, isLoading, error, router]);

  const handleRefresh = React.useCallback(async () => {
    if (groupId) {
      queryClient.invalidateQueries({ queryKey: groupsKeys.lobbySummary(groupId) });
    }
    await refetchGroup();
  }, [refetchGroup, groupId, queryClient]);

  const infoSheetRef = useRef<BottomSheetModal>(null);
  const editSheetRef = useRef<BottomSheetModal>(null);
  const inviteSheetRef = useRef<BottomSheetModal>(null);
  const updateGroupMutation = useUpdateGroupMutation(groupId);

  const handleOpenInfo = useCallback(() => {
    infoSheetRef.current?.present();
  }, []);

  const handleOpenEdit = useCallback(() => {
    editSheetRef.current?.present();
  }, []);

  const handleOpenInvite = useCallback(() => {
    inviteSheetRef.current?.present();
  }, []);

  // Expandable chat (Spotify-style: bar grows from bottom to full screen)
  const { height: SCREEN_H } = useWindowDimensions();
  const BAR_H = 62 + Math.max(insets.bottom, 16);
  const [chatOpen, setChatOpen] = useState(false);
  const chatExpansion = useSharedValue(0);

  const handleChatGestureStart = useCallback(() => {
    setChatOpen(true);
  }, []);

  const handleChatGestureCancel = useCallback(() => {
    setChatOpen(false);
  }, []);

  const handleChatExpand = useCallback(() => {
    setChatOpen(true);
    // Only animate if not already at 1 (gesture may have already set it)
    if (chatExpansion.value < 1) {
      chatExpansion.value = withTiming(1, { duration: 300 });
    }
  }, []);

  const handleChatCollapse = useCallback(() => {
    chatExpansion.value = withTiming(0, { duration: 280 }, (finished) => {
      if (finished) runOnJS(setChatOpen)(false);
    });
  }, []);

  const chatExpandStyle = useAnimatedStyle(() => {
    // Animate top: starts near bottom (showing only the bar), ends at 0 (full screen)
    const closedTop = SCREEN_H - BAR_H;
    return {
      top: interpolate(chatExpansion.value, [0, 1], [closedTop, 0]),
      bottom: 0,
      borderTopLeftRadius: interpolate(chatExpansion.value, [0, 0.4], [14, 0], "clamp"),
      borderTopRightRadius: interpolate(chatExpansion.value, [0, 0.4], [14, 0], "clamp"),
      marginHorizontal: interpolate(chatExpansion.value, [0, 0.3], [16, 0], "clamp"),
      marginBottom: interpolate(chatExpansion.value, [0, 0.3], [Math.max(insets.bottom, 16), 0], "clamp"),
    };
  });

  const chatContentOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(chatExpansion.value, [0.05, 0.35], [0, 1], "clamp"),
  }));

  const chatBgAlpha = useAnimatedStyle(() => {
    const alpha = interpolate(chatExpansion.value, [0, 0.1], [0.3, 1], "clamp");
    const rgb = colorScheme === "dark" ? "30,30,30" : "255,255,255";
    return { backgroundColor: `rgba(${rgb},${alpha})` };
  });


  // Loading state
  if (isLoading) {
    return <QueryLoadingView message={t("groups.loadingPool")} />;
  }

  // 404/403 — navigating back (effect above handles redirect)
  if (isNotFoundError || (!error && !data)) {
    return <QueryLoadingView message={t("groups.redirecting")} />;
  }

  // Recoverable error (network, 500, etc.) — show retry
  if (error) {
    return (
      <QueryErrorView
        message={error.message ?? t("common.errorOccurred")}
        onRetry={() => refetchGroup()}
      />
    );
  }

  const group = data.data;
  const isCreator = user?.id === group.creatorId;

  // Build content based on status
  let content: React.ReactNode;

  if (group.status === "ended") {
    content = (
      <LobbyWithHeader
        status={group.status}
        hideOverlayHeader
      >
        <GroupLobbyEndedScreen
          group={group}
          onRefresh={handleRefresh}
          isCreator={isCreator}
          isLoading={isFetching}
          onSettingsPress={() =>
            router.push({ pathname: '/groups/[id]/settings', params: { id: String(group.id) } })
          }
        />
      </LobbyWithHeader>
    );
  } else if (group.status === "draft") {
    // Draft screen is no longer used — if status is "draft" it means
    // publish is still in-flight. Show loading until it becomes "active".
    content = <QueryLoadingView message={t("groups.loadingPool")} />;
  } else if (group.status === "active") {
    content = (
      <LobbyWithHeader
        status={group.status}
        hideOverlayHeader
      >
        <GroupLobbyActiveScreen
          group={group}
          onRefresh={handleRefresh}
          isCreator={isCreator}
          isLoading={isFetching}
          onSettingsPress={() =>
            router.push({ pathname: '/groups/[id]/settings', params: { id: String(group.id) } })
          }
          onInfoPress={handleOpenInfo}
          onAvatarPress={isCreator ? handleOpenEdit : undefined}
          onChatExpand={handleChatExpand}
          onChatGestureStart={handleChatGestureStart}
          onChatGestureCancel={handleChatGestureCancel}
          chatExpansion={chatExpansion}
          onScroll={handleScroll}
          onInvitePress={handleOpenInvite}
          onChatFocusChange={handleChatFocusChange}
        />
      </LobbyWithHeader>
    );
  } else {
    content = (
      <LobbyWithHeader status={group.status}>
        <Screen>
          <AppText variant="body" color="secondary">
            {t("groups.unknownStatus")}
          </AppText>
        </Screen>
      </LobbyWithHeader>
    );
  }

  // For active groups, extend content into status bar area
  const isActive = group.status === "active";

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.background,
            marginTop: isActive ? -insets.top : 0,
          }
        ]}
      >
        {content}

        {isActive && (
          <AnimatedStickyHeader
            scrollY={scrollY}
            title={group.name}
            fallbackRoute="/(tabs)/groups"
            tintColor="transparent"
            extendsIntoStatusBar
            threshold={160}
            rightActions={[
              {
                icon: "information-circle-outline",
                onPress: handleOpenInfo,
                size: 22,
              },
              {
                icon: "ellipsis-horizontal",
                onPress: () => router.push({ pathname: '/groups/[id]/settings', params: { id: String(group.id) } }),
                size: 22,
              },
            ]}
          />
        )}

        {/* Chat backdrop overlay — rendered after sticky header so it covers everything */}
        {chatFocused && (
          <Animated.View
            key={`chat-backdrop-${chatFocusKey.current}`}
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={[styles.chatBackdrop, { backgroundColor: theme.colors.overlay }]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={() => {
              Keyboard.dismiss();
            }} />
          </Animated.View>
        )}

        <GroupInfoSheet
          group={group}
          sheetRef={infoSheetRef}
          isLoading={isFetching}
        />
        {isCreator && (
          <GroupEditSheet
            sheetRef={editSheetRef}
            group={group}
            updateGroupMutation={updateGroupMutation}
            onAvatarChange={() =>
              queryClient.invalidateQueries({ queryKey: groupsKeys.lists() })
            }
          />
        )}
        <GroupInviteSheet
          groupId={groupId}
          groupName={group.name}
          sheetRef={inviteSheetRef}
        />
      </View>

      {/* Expanding chat — grows from bottom over everything */}
      {chatOpen && (
        <Animated.View
          style={[
            styles.chatExpandable,
            chatExpandStyle,
            chatBgAlpha,
          ]}
        >
          <Animated.View style={[{ flex: 1 }, chatContentOpacity]}>
            <View style={{ backgroundColor: theme.colors.background, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border }}>
              <View style={{ flexDirection: "row", alignItems: "center", paddingTop: insets.top + 4, paddingBottom: 6, paddingHorizontal: 16 }}>
                <Pressable onPress={handleChatCollapse} hitSlop={16}>
                  <Ionicons name="chevron-down" size={28} color={theme.colors.textPrimary} />
                </Pressable>
                <View style={{ flex: 1 }} />
                <View style={{ width: 28 }} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <GroupChatScreen groupId={groupId} keyboardVerticalOffset={insets.top + 40} />
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  chatBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    zIndex: 50,
  },
  chatExpandable: {
    position: "absolute",
    left: 0,
    right: 0,
    overflow: "hidden",
    zIndex: 9999,
  },
});
