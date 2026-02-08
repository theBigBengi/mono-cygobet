// app/(tabs)/home.tsx
// Home tab - Group creation flow (fixture selection, league/team browsing).

import React from "react";
import { CreateGroupScreen } from "@/features/group-creation";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function HomeScreen() {
  return (
    <ErrorBoundary feature="create-group">
      <CreateGroupScreen />
    </ErrorBoundary>
  );
}
