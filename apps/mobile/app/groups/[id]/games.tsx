// app/groups/[id]/games.tsx
// Route wrapper for group games screen (feature-first).
// Routes to appropriate screen based on group status.

import React from "react";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams } from "expo-router";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import { useGroupQuery } from "@/domains/groups";
import { GroupGamesScreen } from "@/features/groups/predictions/screens/GroupGamesScreen";
import { GroupGamesDraftScreen } from "@/features/groups/predictions/screens/GroupGamesDraftScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function GroupGamesRoute() {
  return (
    <ErrorBoundary feature="group-games">
      <GroupGamesContent />
    </ErrorBoundary>
  );
}

function GroupGamesContent() {
  const { t } = useTranslation("common");
  const params = useLocalSearchParams<{ id: string }>();
  const groupId =
    params.id && !isNaN(Number(params.id)) ? Number(params.id) : null;

  const { data, isLoading, error } = useGroupQuery(groupId, {
    includeFixtures: true,
  });

  // Loading state
  if (isLoading) {
    return <QueryLoadingView message={t("groups.loadingGroup")} />;
  }

  // Error state
  if (error || !data) {
    return <QueryErrorView message={t("groups.failedLoadGroup")} />;
  }

  const group = data.data;
  const fixtures = Array.isArray(group.fixtures) ? group.fixtures : [];

  // Route to appropriate screen based on status
  if (group.status === "draft") {
    return (
      <GroupGamesDraftScreen
        groupId={groupId}
        fixtures={fixtures}
        selectionMode={group.selectionMode}
      />
    );
  }

  // For active and other statuses, use the regular screen with predictions
  return (
    <GroupGamesScreen
      groupId={groupId}
      fixtures={fixtures}
      predictionMode={group.predictionMode}
      groupName={group.name}
      selectionMode={group.selectionMode}
      groupTeamsIds={group.groupTeamsIds}
    />
  );
}
