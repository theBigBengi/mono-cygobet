// app/groups/[id]/member/[userId].tsx
// Route wrapper for group member profile screen.

import React from "react";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams } from "expo-router";
import { ScreenWithHeader } from "@/components/ui";
import { GroupMemberProfileScreen } from "@/features/groups/ranking";

function parseNum(value: string | string[] | undefined): number | null {
  const s = Array.isArray(value) ? value[0] : value;
  if (s == null || s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseStr(value: string | string[] | undefined): string {
  const s = Array.isArray(value) ? value[0] : value;
  return s ?? "";
}

export default function GroupMemberProfileRoute() {
  const { t } = useTranslation("common");
  const params = useLocalSearchParams<{
    id: string;
    userId: string;
    username?: string;
    rank?: string;
    totalPoints?: string;
    correctScoreCount?: string;
    predictionCount?: string;
  }>();

  const groupId =
    params.id && !isNaN(Number(params.id)) ? Number(params.id) : null;
  const userId =
    params.userId && !isNaN(Number(params.userId))
      ? Number(params.userId)
      : null;

  const username = parseStr(params.username);
  const rank = parseNum(params.rank);
  const totalPoints = parseNum(params.totalPoints);
  const correctScoreCount = parseNum(params.correctScoreCount);
  const predictionCount = parseNum(params.predictionCount);

  const title = username || t("groups.member");

  return (
    <ScreenWithHeader title={title}>
      <GroupMemberProfileScreen
        groupId={groupId}
        userId={userId}
        username={username}
        rank={rank}
        totalPoints={totalPoints}
        correctScoreCount={correctScoreCount}
        predictionCount={predictionCount}
      />
    </ScreenWithHeader>
  );
}
