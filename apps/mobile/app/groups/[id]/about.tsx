// app/groups/[id]/about.tsx
// Group about screen route.

import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScreenWithHeader } from "@/components/ui";
import { GroupAboutScreen } from "@/features/groups/group-lobby/screens/GroupAboutScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function GroupAboutRoute() {
  return (
    <ErrorBoundary feature="group-about">
      <AboutContent />
    </ErrorBoundary>
  );
}

function AboutContent() {
  const params = useLocalSearchParams<{ id: string }>();
  const groupId =
    params.id && !isNaN(Number(params.id)) ? Number(params.id) : null;
  const { t } = useTranslation("common");

  return (
    <ScreenWithHeader title={t("lobby.about")}>
      <GroupAboutScreen groupId={groupId} />
    </ScreenWithHeader>
  );
}
