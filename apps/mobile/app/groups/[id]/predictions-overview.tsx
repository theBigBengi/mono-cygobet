// app/groups/[id]/predictions-overview.tsx
// Route wrapper for predictions overview screen.

import React from "react";
import { useLocalSearchParams } from "expo-router";
import { ScreenWithHeader } from "@/components/ui";
import { PredictionsOverviewScreen } from "@/features/groups/predictions-overview";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useGroupQuery, usePredictionsOverviewQuery } from "@/domains/groups";

export default function PredictionsOverviewRoute() {
  return (
    <ErrorBoundary feature="predictions-overview">
      <PredictionsOverviewContent />
    </ErrorBoundary>
  );
}

function PredictionsOverviewContent() {
  const params = useLocalSearchParams<{ id: string }>();
  const groupId =
    params.id && !isNaN(Number(params.id)) ? Number(params.id) : null;

  const { data: groupData } = useGroupQuery(groupId);
  const groupName = groupData?.data?.name ?? "";
  const { data: overviewData } = usePredictionsOverviewQuery(groupId);
  const hasLive = overviewData?.data?.fixtures.some((f) => f.liveMinute != null) ?? false;

  return (
    <ScreenWithHeader title={groupName} subtitle="Bird's eye view" showLiveDot={hasLive}>
      <PredictionsOverviewScreen groupId={groupId} />
    </ScreenWithHeader>
  );
}
