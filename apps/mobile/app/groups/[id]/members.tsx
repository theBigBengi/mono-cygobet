// app/groups/[id]/members.tsx
// Route wrapper for group members screen.

import React from "react";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScreenWithHeader } from "@/components/ui";
import { GroupMembersScreen } from "@/features/groups/members";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function GroupMembersRoute() {
  return (
    <ErrorBoundary feature="group-members">
      <MembersContent />
    </ErrorBoundary>
  );
}

function MembersContent() {
  const params = useLocalSearchParams<{ id: string }>();
  const groupId =
    params.id && !isNaN(Number(params.id)) ? Number(params.id) : null;

  const { t } = useTranslation("common");
  return (
    <ScreenWithHeader title={t("groups.membersTitle")}>
      <GroupMembersScreen groupId={groupId} />
    </ScreenWithHeader>
  );
}
