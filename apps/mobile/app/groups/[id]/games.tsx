// app/groups/[id]/games.tsx
// Route wrapper for group games screen (feature-first).
// Routes to appropriate screen based on group status.

import React from "react";
import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import { useGroupQuery } from "@/domains/groups";
import { useTheme } from "@/lib/theme";
import { GroupGamesScreen } from "@/features/groups/predictions/screens/GroupGamesScreen";
import { GroupGamesSkeleton } from "@/features/groups/predictions/components/GroupGamesSkeleton";
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

  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Show skeleton when initial fetch OR when placeholder data has no fixtures yet
  if (isLoading || (!hasFixturesLoaded && isFetching)) {
    return (
      <View style={[loadingStyles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <GroupGamesSkeleton />
      </View>
    );
  }

  // Error state
  if (error || !data || !group) {
    return <QueryErrorView message={t("groups.failedLoadGroup")} />;
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

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
