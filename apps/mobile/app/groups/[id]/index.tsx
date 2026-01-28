// app/groups/[id]/index.tsx
// Group lobby screen (draft/active state).
// Routes to appropriate screen based on group status.
// - Draft status → GroupLobbyDraftScreen
// - Active status → GroupLobbyActiveScreen
// - Ended status → Simple ended message

import React, { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSetAtom } from "jotai";
import { Screen, AppText } from "@/components/ui";
import { useGroupQuery, useGroupGamesFiltersQuery } from "@/domains/groups";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import { useAuth } from "@/lib/auth/useAuth";
import { globalBlockingOverlayAtom } from "@/lib/state/globalOverlay.atom";
import {
  GroupLobbyDraftScreen,
  GroupLobbyActiveScreen,
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
      <LobbyWithHeader status={group.status}>
        <Screen>
          <AppText variant="body" color="secondary">
            This group has ended.
          </AppText>
        </Screen>
      </LobbyWithHeader>
    );
  }

  if (group.status === "draft") {
    return (
      <LobbyWithHeader status={group.status}>
        <GroupLobbyDraftScreen
          group={group}
          onRefresh={handleRefresh}
          isCreator={isCreator}
        />
      </LobbyWithHeader>
    );
  }

  if (group.status === "active") {
    return (
      <LobbyWithHeader status={group.status} groupName={group.name}>
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


