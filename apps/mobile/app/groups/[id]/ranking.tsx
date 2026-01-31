// app/groups/[id]/ranking.tsx
// Route wrapper for group ranking screen.

import React from "react";
import { useLocalSearchParams } from "expo-router";
import { ScreenWithHeader } from "@/components/ui";
import { GroupRankingScreen } from "@/features/groups/ranking";

export default function GroupRankingRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  const groupId =
    params.id && !isNaN(Number(params.id)) ? Number(params.id) : null;

  return (
    <ScreenWithHeader title="Ranking">
      <GroupRankingScreen groupId={groupId} />
    </ScreenWithHeader>
  );
}
