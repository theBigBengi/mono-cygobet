// app/groups/[id]/invite.tsx
// Route wrapper for group invite screen.

import React from "react";
import { useLocalSearchParams } from "expo-router";
import { GroupInviteScreen } from "@/features/groups/invite";

export default function GroupInviteRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  const groupId =
    params.id && !isNaN(Number(params.id)) ? Number(params.id) : null;

  return <GroupInviteScreen groupId={groupId} />;
}
