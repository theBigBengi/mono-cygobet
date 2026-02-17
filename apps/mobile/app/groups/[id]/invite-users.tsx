// app/groups/[id]/invite-users.tsx
// Invite users to group by username search.

import React from "react";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScreenWithHeader } from "@/components/ui";
import { UserSearchScreen } from "@/features/invites";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useGroupQuery } from "@/domains/groups";

export default function InviteUsersRoute() {
  return (
    <ErrorBoundary feature="invite-users">
      <InviteUsersContent />
    </ErrorBoundary>
  );
}

function InviteUsersContent() {
  const params = useLocalSearchParams<{ id: string }>();
  const groupId =
    params.id && !isNaN(Number(params.id)) ? Number(params.id) : null;
  const { t } = useTranslation("common");
  const { data: groupData } = useGroupQuery(groupId);
  const groupName = groupData?.data?.name;

  const title = groupName
    ? t("invites.inviteToGroup", { name: groupName })
    : t("invites.inviteToGroupDefault");

  if (groupId == null) {
    return null;
  }

  return (
    <ScreenWithHeader title={title}>
      <UserSearchScreen groupId={groupId} groupName={groupName} />
    </ScreenWithHeader>
  );
}
