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
import type { PredictionMode } from "@/features/groups/predictions/types";
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
  const params = useLocalSearchParams<{ id: string; scrollIndex?: string; scrollToFixtureId?: string }>();
  const groupId =
    params.id && !isNaN(Number(params.id)) ? Number(params.id) : null;
  const scrollIndex =
    params.scrollIndex && !isNaN(Number(params.scrollIndex))
      ? Number(params.scrollIndex)
      : undefined;
  const scrollToFixtureId =
    params.scrollToFixtureId && !isNaN(Number(params.scrollToFixtureId))
      ? Number(params.scrollToFixtureId)
      : undefined;

  const { data, isLoading, isFetching, error } = useGroupQuery(groupId, {
    includeFixtures: true,
  });

  const group = data?.data;
  const hasFixturesLoaded = group?.fixtures !== undefined;
  const fixtures = Array.isArray(group?.fixtures) ? group.fixtures : [];

  // Show loading when initial fetch OR when placeholder data has no fixtures yet
  if (isLoading || (!hasFixturesLoaded && isFetching)) {
    return <QueryLoadingView message={t("groups.loadingGroup")} />;
  }

  // Error state
  if (error || !data || !group) {
    return <QueryErrorView message={t("groups.failedLoadGroup")} />;
  }

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
      predictionMode={group.predictionMode as PredictionMode | undefined}
      groupName={group.name}
      selectionMode={group.selectionMode}
      groupTeamsIds={group.groupTeamsIds}
      scrollToIndex={scrollIndex}
      scrollToFixtureId={scrollToFixtureId}
      maxPossiblePoints={group.onTheNosePoints}
    />
  );
}
