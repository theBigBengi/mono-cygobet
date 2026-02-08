// app/profile/head-to-head.tsx
// Head-to-head comparison route. Reads opponentId from query params.

import React from "react";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { HeadToHeadScreen } from "@/features/profile/head-to-head/screens/HeadToHeadScreen";
import { ScreenWithHeader } from "@/components/ui";
import { useAuth } from "@/lib/auth/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";

function parseNum(value: string | string[] | undefined): number | null {
  const s = Array.isArray(value) ? value[0] : value;
  if (s == null || s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export default function HeadToHeadRoute() {
  return (
    <ErrorBoundary feature="head-to-head">
      <HeadToHeadContent />
    </ErrorBoundary>
  );
}

function HeadToHeadContent() {
  const params = useLocalSearchParams<{ opponentId?: string }>();
  const { user } = useAuth();

  const opponentId = parseNum(params.opponentId);
  const userId = user?.id ?? 0;

  const { t } = useTranslation("common");
  return (
    <ScreenWithHeader
      title={t("profile.headToHead")}
      fallbackRoute="/(tabs)/profile"
    >
      <HeadToHeadScreen userId={userId} initialOpponentId={opponentId} />
    </ScreenWithHeader>
  );
}
