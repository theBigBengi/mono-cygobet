// app/groups/[id]/settings.tsx
// Group settings screen route.

import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScreenWithHeader } from "@/components/ui";
import { GroupSettingsScreen } from "@/features/groups/group-settings/GroupSettingsScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function GroupSettingsRoute() {
  return (
    <ErrorBoundary feature="group-settings">
      <SettingsContent />
    </ErrorBoundary>
  );
}

function SettingsContent() {
  const params = useLocalSearchParams<{ id: string }>();
  const groupId =
    params.id && !isNaN(Number(params.id)) ? Number(params.id) : null;
  const { t } = useTranslation("common");

  return (
    <ScreenWithHeader title={t("lobby.groupSettings")}>
      <GroupSettingsScreen groupId={groupId} />
    </ScreenWithHeader>
  );
}
