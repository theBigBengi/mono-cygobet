// app/groups/[id]/fixtures/[fixtureId].tsx
// Dedicated single game (fixture) prediction screen.
// Minimal route — just extract params and render SingleGameScreen.
// Data loading is handled inside SingleGameScreen for faster navigation transitions.

import React from "react";
import { useLocalSearchParams } from "expo-router";
import { SingleGameScreen } from "@/features/groups/predictions/screens/SingleGameScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function SingleGameRoute() {
  return (
    <ErrorBoundary feature="fixture-detail">
      <SingleGameContent />
    </ErrorBoundary>
  );
}

function SingleGameContent() {
  const params = useLocalSearchParams<{ id: string; fixtureId: string }>();
  const groupId =
    params.id && !isNaN(Number(params.id)) ? Number(params.id) : null;
  const fixtureId =
    params.fixtureId && !isNaN(Number(params.fixtureId))
      ? Number(params.fixtureId)
      : null;

  return (
    <SingleGameScreen
      groupId={groupId}
      fixtureId={fixtureId}
    />
  );
}
