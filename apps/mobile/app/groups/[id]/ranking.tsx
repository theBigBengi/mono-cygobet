// app/groups/[id]/ranking.tsx
// Route wrapper for group ranking screen.

import React from "react";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScreenWithHeader } from "@/components/ui";
import { GroupRankingScreen } from "@/features/groups/ranking";

export default function GroupRankingRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  const groupId =
    params.id && !isNaN(Number(params.id)) ? Number(params.id) : null;

  const { t } = useTranslation("common");
  return (
    <ScreenWithHeader title={t("groups.ranking")}>
      <GroupRankingScreen groupId={groupId} />
    </ScreenWithHeader>
  );
}
