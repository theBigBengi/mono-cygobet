// app/groups/discover.tsx
// Browse public groups and join by ID.

import React from "react";
import { ScreenWithHeader } from "@/components/ui";
import { DiscoverGroupsScreen } from "@/features/groups/discover";

export default function DiscoverGroupsRoute() {
  return (
    <ScreenWithHeader title="Discover">
      <DiscoverGroupsScreen />
    </ScreenWithHeader>
  );
}
