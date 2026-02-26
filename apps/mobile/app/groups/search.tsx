// app/groups/search.tsx
// Search/discover groups screen — search + quick actions.

import React from "react";
import { GroupsSearchScreen } from "@/features/groups/group-list/screens/GroupsSearchScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function GroupsSearchRoute() {
  return (
    <ErrorBoundary feature="groups-search">
      <GroupsSearchScreen />
    </ErrorBoundary>
  );
}
