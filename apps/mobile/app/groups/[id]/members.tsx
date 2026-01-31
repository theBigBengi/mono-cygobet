// app/groups/[id]/members.tsx
// Route wrapper for group members screen.

import React from "react";
import { useLocalSearchParams } from "expo-router";
import { ScreenWithHeader } from "@/components/ui";
import { GroupMembersScreen } from "@/features/groups/members";

export default function GroupMembersRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  const groupId =
    params.id && !isNaN(Number(params.id)) ? Number(params.id) : null;

  return (
    <ScreenWithHeader title="Members">
      <GroupMembersScreen groupId={groupId} />
    </ScreenWithHeader>
  );
}
