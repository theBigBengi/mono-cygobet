// app/profile/head-to-head.tsx
// Head-to-head comparison route. Reads opponentId from query params.

import React from "react";
import { useLocalSearchParams } from "expo-router";
import { HeadToHeadScreen } from "@/features/profile/head-to-head/screens/HeadToHeadScreen";
import { ScreenWithHeader } from "@/components/ui";
import { useAuth } from "@/lib/auth/useAuth";

function parseNum(value: string | string[] | undefined): number | null {
  const s = Array.isArray(value) ? value[0] : value;
  if (s == null || s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export default function HeadToHeadRoute() {
  const params = useLocalSearchParams<{ opponentId?: string }>();
  const { user } = useAuth();

  const opponentId = parseNum(params.opponentId);
  const userId = user?.id ?? 0;

  return (
    <ScreenWithHeader title="Head to Head" fallbackRoute="/(tabs)/profile">
      <HeadToHeadScreen
        userId={userId}
        initialOpponentId={opponentId}
      />
    </ScreenWithHeader>
  );
}
