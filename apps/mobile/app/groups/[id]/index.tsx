// app/groups/[id]/index.tsx
// Group lobby screen.
// Routes to appropriate screen based on group status.
// - Draft status → GroupLobbyDraftScreen
// - Active status → GroupLobbyActiveScreen
// - Ended status → GroupLobbyEndedScreen

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSetAtom } from "jotai";
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
  Pressable,
  Keyboard,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Screen, AppText } from "@/components/ui";
import { AnimatedStickyHeader } from "@/components/ui/AnimatedStickyHeader";
import { useQueryClient } from "@tanstack/react-query";
import { useGroupQuery, useDeleteGroupMutation, useUpdateGroupMutation, groupsKeys } from "@/domains/groups";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { useAuth } from "@/lib/auth/useAuth";
import { useTheme } from "@/lib/theme";
import { globalBlockingOverlayAtom } from "@/lib/state/globalOverlay.atom";
import { activeGroupIdAtom } from "@/lib/state/activeGroup.atom";
import {
  GroupLobbyDraftScreen,
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

  // Navigate back to groups screen if group not found
  useEffect(() => {
    if (error || (!isLoading && !data)) {
      // Navigate to groups tab when group is not found
      router.replace("/(tabs)/groups" as any);
    }
  }, [error, data, isLoading, router]);

  const handleRefresh = React.useCallback(async () => {
    if (groupId) {
      queryClient.invalidateQueries({ queryKey: groupsKeys.lobbySummary(groupId) });
    }
    await refetchGroup();
  }, [refetchGroup, groupId, queryClient]);

  const deleteGroupMutation = useDeleteGroupMutation(groupId ?? 0);
  const [isPublishing, setIsPublishing] = useState(false);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const infoSheetRef = useRef<BottomSheetModal>(null);
  const editSheetRef = useRef<BottomSheetModal>(null);
  const inviteSheetRef = useRef<BottomSheetModal>(null);
  const updateGroupMutation = useUpdateGroupMutation(groupId ?? 0);

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
  const SCREEN_H = Dimensions.get("window").height;
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


  useEffect(() => {
    return () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, []);

  const handleDeleteGroup = React.useCallback(() => {
    Alert.alert(t("groups.deleteGroupDraft"), t("groups.deleteGroupConfirm"), [
      { text: t("groups.cancel"), style: "cancel" },
      {
        text: t("groups.delete"),
        style: "destructive",
        onPress: () => {
          deleteGroupMutation.mutate(undefined, {
            onSuccess: () => {
              router.back();
              fallbackTimerRef.current = setTimeout(() => {
                router.replace("/(tabs)/groups" as any);
                fallbackTimerRef.current = null;
              }, 300);
            },
            onError: (error: any) => {
              Alert.alert(
                t("errors.error"),
                error?.message || t("groups.deleteGroupDraftFailed")
              );
            },
          });
        },
      },
    ]);
  }, [deleteGroupMutation, router]);

  // Dismiss publish overlay once active screen has rendered
  useEffect(() => {
    if (!isPublishing) return;
    if (data?.data?.status === "active") {
      const timer = setTimeout(() => setIsPublishing(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isPublishing, data?.data?.status]);

  // Fallback: force dismiss after 8s (safety net)
  useEffect(() => {
    if (!isPublishing) return;
    const fallback = setTimeout(() => setIsPublishing(false), 8000);
    return () => clearTimeout(fallback);
  }, [isPublishing]);

  const handlePublishStart = useCallback(() => {
    setIsPublishing(true);
  }, []);

  const handlePublishError = useCallback(() => {
    setIsPublishing(false);
    Alert.alert(t("errors.error"), t("groups.publishFailed"));
  }, [t]);

  // Loading state
  if (isLoading) {
    return <QueryLoadingView message={t("groups.loadingPool")} />;
  }

  // Error state - show loading while navigating back
  if (error || !data) {
    return <QueryLoadingView message={t("groups.redirecting")} />;
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
            router.push(`/groups/${group.id}/settings` as any)
          }
        />
      </LobbyWithHeader>
    );
  } else if (group.status === "draft") {
    content = (
      <LobbyWithHeader
        status={group.status}
        onDeleteGroup={isCreator ? handleDeleteGroup : undefined}
        isDeleting={deleteGroupMutation.isPending}
      >
        <GroupLobbyDraftScreen
          group={group}
          onRefresh={handleRefresh}
          isCreator={isCreator}
          onPublishStart={handlePublishStart}
          onPublishError={handlePublishError}
          isLoading={isFetching}
        />
      </LobbyWithHeader>
    );
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
            router.push(`/groups/${group.id}/settings` as any)
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

  const isDark = colorScheme === "dark";
  const showOverlay = isPublishing || deleteGroupMutation.isPending;


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
                onPress: () => router.push(`/groups/${group.id}/settings` as any),
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
            style={styles.chatBackdrop}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={() => {
              Keyboard.dismiss();
            }} />
          </Animated.View>
        )}

        {showOverlay && (
          <View style={styles.overlay} pointerEvents="box-none">
            <BlurView
              intensity={80}
              tint={isDark ? "dark" : "light"}
              style={[
                StyleSheet.absoluteFill,
                Platform.OS === "android" && {
                  backgroundColor: isDark
                    ? "rgba(0, 0, 0, 0.85)"
                    : "rgba(255, 255, 255, 0.85)",
                },
              ]}
            />
            <View style={styles.overlayContent}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <AppText variant="body" style={styles.overlayText}>
                {isPublishing
                  ? t("lobby.publishingGroup")
                  : t("lobby.deletingGroup")}
              </AppText>
            </View>
          </View>
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    justifyContent: "center",
    alignItems: "center",
  },
  overlayContent: {
    alignItems: "center",
    gap: 16,
  },
  overlayText: {
    marginTop: 12,
  },
  chatBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
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
