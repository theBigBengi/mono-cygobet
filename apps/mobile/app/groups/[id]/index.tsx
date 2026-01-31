// app/groups/[id]/index.tsx
// Group lobby screen.
// Routes to appropriate screen based on group status.
// - Draft status → GroupLobbyDraftScreen
// - Active status → GroupLobbyActiveScreen
// - Ended status → GroupLobbyEndedScreen

import React, { useEffect, useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSetAtom } from "jotai";
import { View, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { BlurView } from "expo-blur";
import { Screen, AppText } from "@/components/ui";
import { useGroupQuery, useGroupGamesFiltersQuery, useDeleteGroupMutation } from "@/domains/groups";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { useAuth } from "@/lib/auth/useAuth";
import { useTheme } from "@/lib/theme";
import { globalBlockingOverlayAtom } from "@/lib/state/globalOverlay.atom";
import {
  GroupLobbyDraftScreen,
  GroupLobbyActiveScreen,
  GroupLobbyEndedScreen,
  LobbyWithHeader,
} from "@/features/groups/group-lobby";

/**
 * Group Lobby Screen
 * 
 * Main screen component for viewing and managing group lobby.
 * Handles data fetching, error states, and routes to appropriate screen based on status.
 */

export default function GroupLobbyScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { theme, colorScheme } = useTheme();
  const setOverlay = useSetAtom(globalBlockingOverlayAtom);
  const groupId =
    params.id && !isNaN(Number(params.id)) ? Number(params.id) : null;

  const { data, isLoading, error, refetch: refetchGroup } =
    useGroupQuery(groupId, { includeFixtures: true });

  useGroupGamesFiltersQuery(groupId);

  // Turn off global overlay when screen mounts
  // Delay ensures the screen is painted before overlay disappears
  // This prevents white screen flash during navigation transition
  useEffect(() => {
    const timer = setTimeout(() => {
      setOverlay(false);
    }, 1000); // Delay to allow screen to paint and transition to complete

    return () => {
      clearTimeout(timer);
    };
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
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, []);

  const handleDeleteGroup = React.useCallback(() => {
    Alert.alert(
      "Delete Group Draft",
      "Are you sure you want to delete the group? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
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
                  "שגיאה",
                  error?.message || "Delete group draft failed. Please try again."
                );
              },
            });
          },
        },
      ]
    );
  }, [deleteGroupMutation, router]);

  // Loading state
  if (isLoading) {
    return <QueryLoadingView message="Loading pool..." />;
  }

  // Error state - show loading while navigating back
  if (error || !data) {
    return <QueryLoadingView message="Redirecting..." />;
  }

  const group = data.data;
  const isCreator = user?.id === group.creatorId;

  // Route to appropriate screen based on status
  if (group.status === "ended") {
    return (
      <LobbyWithHeader status={group.status} groupName={group.name}>
        <GroupLobbyEndedScreen group={group} onRefresh={handleRefresh} />
      </LobbyWithHeader>
    );
  }

  if (group.status === "draft") {
    const isDark = colorScheme === "dark";
    return (
      <View style={styles.draftContainer}>
        <LobbyWithHeader
          status={group.status}
          onDeleteGroup={isCreator ? handleDeleteGroup : undefined}
          isDeleting={deleteGroupMutation.isPending}
        >
          <GroupLobbyDraftScreen
            group={group}
            onRefresh={handleRefresh}
            isCreator={isCreator}
          />
        </LobbyWithHeader>
        {deleteGroupMutation.isPending && (
          <View style={styles.overlay} pointerEvents="box-none">
            <BlurView
              intensity={80}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.overlayContent}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <AppText variant="body" style={styles.overlayText}>
                Deleting group...
              </AppText>
            </View>
          </View>
        )}
      </View>
    );
  }

  if (group.status === "active") {
    return (
      <LobbyWithHeader
        status={group.status}
        groupName={group.name}
        group={group}
        isCreator={isCreator}
      >
        <GroupLobbyActiveScreen
          group={group}
          onRefresh={handleRefresh}
          isCreator={isCreator}
        />
      </LobbyWithHeader>
    );
  }

  // Fallback for unknown status
  return (
    <LobbyWithHeader status={group.status}>
      <Screen>
        <AppText variant="body" color="secondary">
          Unknown group status.
        </AppText>
      </Screen>
    </LobbyWithHeader>
  );
}

const styles = StyleSheet.create({
  draftContainer: {
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
});


