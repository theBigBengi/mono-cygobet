// app/groups/[id]/predictions-overview.tsx
// Route wrapper for predictions overview screen.

import React from "react";
import { useLocalSearchParams } from "expo-router";
import { ScreenWithHeader } from "@/components/ui";
import { PredictionsOverviewScreen } from "@/features/groups/predictions-overview";

export default function PredictionsOverviewRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  const groupId =
    params.id && !isNaN(Number(params.id)) ? Number(params.id) : null;

  return (
    <ScreenWithHeader title="Predictions">
      <PredictionsOverviewScreen groupId={groupId} />
    </ScreenWithHeader>
  );
}
