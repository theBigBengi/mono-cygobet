// app/groups/[id]/invite.tsx
// Route wrapper for group invite screen.

import React from "react";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScreenWithHeader } from "@/components/ui";
import { GroupInviteScreen } from "@/features/groups/invite";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useGroupQuery } from "@/domains/groups";

export default function GroupInviteRoute() {
  return (
    <ErrorBoundary feature="group-invite">
      <InviteContent />
    </ErrorBoundary>
  );
}

function InviteContent() {
  const params = useLocalSearchParams<{ id: string }>();
  const groupId =
    params.id && !isNaN(Number(params.id)) ? Number(params.id) : null;

  const { data: groupData } = useGroupQuery(groupId);
  const group = groupData?.data;

  const { t } = useTranslation("common");
  return (
    <ScreenWithHeader title={group?.name ?? t("groups.invite")}>
      <GroupInviteScreen groupId={groupId} groupName={group?.name} />
    </ScreenWithHeader>
  );
}
