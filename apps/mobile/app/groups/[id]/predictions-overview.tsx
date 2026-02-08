// app/groups/[id]/predictions-overview.tsx
// Route wrapper for predictions overview screen.

import React from "react";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScreenWithHeader } from "@/components/ui";
import { PredictionsOverviewScreen } from "@/features/groups/predictions-overview";
import { ErrorBoundary } from "@/components/ErrorBoundary";

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

  const { t } = useTranslation("common");
  return (
    <ScreenWithHeader title={t("groups.predictions")}>
      <PredictionsOverviewScreen groupId={groupId} />
    </ScreenWithHeader>
  );
}
