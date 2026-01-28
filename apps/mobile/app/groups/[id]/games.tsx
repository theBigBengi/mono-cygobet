// app/groups/[id]/games.tsx
// Route wrapper for group games screen (feature-first).
// Routes to appropriate screen based on group status.

import React from "react";
import { useLocalSearchParams } from "expo-router";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import { useGroupQuery } from "@/domains/groups";
import { GroupGamesScreen } from "@/features/groups/predictions/screens/GroupGamesScreen";
import { GroupGamesDraftScreen } from "@/features/groups/predictions/screens/GroupGamesDraftScreen";

export default function GroupGamesRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  const groupId =
    params.id && !isNaN(Number(params.id)) ? Number(params.id) : null;

  const { data, isLoading, error } = useGroupQuery(groupId, { includeFixtures: true });

  // Loading state
  if (isLoading) {
    return <QueryLoadingView message="Loading group..." />;
  }

  // Error state
  if (error || !data) {
    return <QueryErrorView message="Failed to load group" />;
  }

  const group = data.data;
  const fixtures = Array.isArray(group.fixtures) ? group.fixtures : [];

  // Route to appropriate screen based on status
  if (group.status === "draft") {
    return <GroupGamesDraftScreen groupId={groupId} fixtures={fixtures} />;
  }

  // For active and other statuses, use the regular screen with predictions
  return <GroupGamesScreen groupId={groupId} fixtures={fixtures} />;
}
