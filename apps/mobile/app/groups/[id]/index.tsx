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
} from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Screen, AppText } from "@/components/ui";
import { AnimatedStickyHeader } from "@/components/ui/AnimatedStickyHeader";
import { useGroupQuery, useDeleteGroupMutation } from "@/domains/groups";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { useAuth } from "@/lib/auth/useAuth";
import { useTheme } from "@/lib/theme";
import { globalBlockingOverlayAtom } from "@/lib/state/globalOverlay.atom";
import {
  GroupLobbyDraftScreen,
  GroupLobbyActiveScreen,
  GroupLobbyEndedScreen,
  LobbyWithHeader,
  GroupInfoSheet,
} from "@/features/groups/group-lobby";
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
  const setOverlay = useSetAtom(globalBlockingOverlayAtom);
  const groupId =
    params.id && !isNaN(Number(params.id)) ? Number(params.id) : null;

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
  } = useGroupQuery(groupId, { includeFixtures: true });

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
    await refetchGroup();
  }, [refetchGroup]);

  const deleteGroupMutation = useDeleteGroupMutation(groupId ?? 0);
  const [isPublishing, setIsPublishing] = useState(false);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const infoSheetRef = useRef<BottomSheetModal>(null);

  const handleOpenInfo = useCallback(() => {
    infoSheetRef.current?.present();
  }, []);

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
          onScroll={handleScroll}
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

  // Status bar background color - matches gradient top
  const statusBarColor = theme.colors.primary + "40";

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          // Pull content into status bar area for active groups
          marginTop: isActive ? -insets.top : 0,
        }
      ]}
    >
      {/* Gradient starts at container top (now in status bar area) */}
      {isActive && (
        <LinearGradient
          colors={[
            statusBarColor,
            theme.colors.primary + "25",
            theme.colors.primary + "10",
            "transparent",
          ]}
          locations={[0, 0.3, 0.6, 1]}
          style={[styles.statusBarGradient, { height: insets.top + 280 }]}
          pointerEvents="none"
        />
      )}

      {content}

      {/* Sticky header - only for active groups */}
      {isActive && (
        <AnimatedStickyHeader
          scrollY={scrollY}
          title={group.name}
          fallbackRoute="/(tabs)/groups"
          tintColor={statusBarColor}
          extendsIntoStatusBar
          transparentIcons
          // Threshold: header appears when group name scrolls behind it
          threshold={160}
          rightActions={[
            {
              icon: "settings-outline",
              onPress: () => router.push(`/groups/${group.id}/settings` as any),
            },
          ]}
        />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusBarGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
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
});
