// app/groups/[id]/invite.tsx
// Route wrapper for group invite screen.

import React from "react";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScreenWithHeader } from "@/components/ui";
import { GroupInviteScreen } from "@/features/groups/invite";

export default function GroupInviteRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  const groupId =
    params.id && !isNaN(Number(params.id)) ? Number(params.id) : null;

  const { t } = useTranslation("common");
  return (
    <ScreenWithHeader title={t("groups.invite")}>
      <GroupInviteScreen groupId={groupId} />
    </ScreenWithHeader>
  );
}
