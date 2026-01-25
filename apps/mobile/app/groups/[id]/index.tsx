// app/groups/[id]/index.tsx
// Group lobby screen (draft/active state).
// Routes to appropriate screen based on group status.
// - Draft status → GroupLobbyDraftScreen
// - Active status → GroupLobbyActiveScreen
// - Ended status → Simple ended message

import React from "react";
import { useLocalSearchParams } from "expo-router";
import { Screen, AppText } from "@/components/ui";
import { useGroupQuery } from "@/domains/groups";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import { useAuth } from "@/lib/auth/useAuth";
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
  const { user } = useAuth();
  const groupId =
    params.id && !isNaN(Number(params.id)) ? Number(params.id) : null;

  const { data, isLoading, error, refetch: refetchGroup } =
    useGroupQuery(groupId, { includeFixtures: true });

  const handleRefresh = React.useCallback(async () => {
    await refetchGroup();
  }, [refetchGroup]);

  // Loading state
  if (isLoading) {
    return <QueryLoadingView message="Loading pool..." />;
  }

  // Error state
  if (error || !data) {
    return (
      <QueryErrorView
        message="Group not found"
        // No retry - user should navigate back
      />
    );
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


