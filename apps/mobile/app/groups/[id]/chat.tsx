// app/groups/[id]/chat.tsx
// Route wrapper for group chat screen.

import React from "react";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScreenWithHeader } from "@/components/ui";
import { GroupChatScreen } from "@/features/groups/chat";

export default function GroupChatRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  const groupId =
    params.id && !isNaN(Number(params.id)) ? Number(params.id) : null;

  const { t } = useTranslation("common");
  return (
    <ScreenWithHeader title={t("groups.chat")}>
      <GroupChatScreen groupId={groupId} />
    </ScreenWithHeader>
  );
}
