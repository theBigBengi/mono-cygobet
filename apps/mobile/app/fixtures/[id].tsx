// app/fixtures/[id].tsx
// Route for match detail screen — full fixture + user's predictions across groups.

import React from "react";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams } from "expo-router";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import { useFixtureDetailQuery } from "@/domains/fixtures";
import { MatchDetailScreen } from "@/features/match-detail/screens/MatchDetailScreen";

export default function FixtureDetailRoute() {
  const { t } = useTranslation("common");
  const params = useLocalSearchParams<{ id: string }>();
  const fixtureId =
    params.id && !isNaN(Number(params.id)) ? Number(params.id) : null;

  const { data, isLoading, error } = useFixtureDetailQuery(fixtureId);

  if (fixtureId == null) {
    return <QueryErrorView message={t("errors.somethingWentWrongTitle")} />;
  }

  if (isLoading) {
    return <QueryLoadingView message={t("groups.loadingGroup")} />;
  }

  if (error || !data?.data) {
    return <QueryErrorView message={t("groups.failedLoadGroup")} />;
  }

  return <MatchDetailScreen data={data.data} />;
}
