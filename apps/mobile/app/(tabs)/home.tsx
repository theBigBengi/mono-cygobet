// app/(tabs)/home.tsx
// Games tab – mode selector (Upcoming games | Leagues | Teams) + conditional view.

import React from "react";
import { CreateGroupScreen } from "@/features/group-creation";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function GamesScreen() {
  return (
    <ErrorBoundary feature="create-group">
      <CreateGroupScreen />
    </ErrorBoundary>
  );
}
