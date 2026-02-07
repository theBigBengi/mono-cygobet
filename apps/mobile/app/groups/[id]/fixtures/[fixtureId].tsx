// app/groups/[id]/fixtures/[fixtureId].tsx
// Dedicated single game (fixture) prediction screen.

import React from "react";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams } from "expo-router";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import { useGroupQuery } from "@/domains/groups";
import { SingleGameScreen } from "@/features/groups/predictions/screens/SingleGameScreen";
import type { PredictionMode } from "@/features/groups/predictions/types";

export default function SingleGameRoute() {
  const { t } = useTranslation("common");
  const params = useLocalSearchParams<{ id: string; fixtureId: string }>();
  const groupId =
    params.id && !isNaN(Number(params.id)) ? Number(params.id) : null;
  const fixtureId =
    params.fixtureId && !isNaN(Number(params.fixtureId))
      ? Number(params.fixtureId)
      : null;

  const { data, isLoading, error } = useGroupQuery(groupId, {
    includeFixtures: true,
    staleTime: 5 * 60 * 1000, // 5 minutes — use cached data from games screen
  });

  if (isLoading) {
    return <QueryLoadingView message={t("groups.loadingGroup")} />;
  }
  if (error || !data) {
    return <QueryErrorView message={t("groups.failedLoadGroup")} />;
  }

  const group = data.data;
  const predictionMode: PredictionMode =
    group.predictionMode === "MatchWinner" ? "MatchWinner" : "CorrectScore";

  return (
    <SingleGameScreen
      groupId={groupId}
      fixtureId={fixtureId}
      predictionMode={predictionMode}
    />
  );
}
