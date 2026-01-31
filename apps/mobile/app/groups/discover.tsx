// app/groups/discover.tsx
// Browse public groups and join by ID.

import React from "react";
import { useTranslation } from "react-i18next";
import { ScreenWithHeader } from "@/components/ui";
import { DiscoverGroupsScreen } from "@/features/groups/discover";

export default function DiscoverGroupsRoute() {
  const { t } = useTranslation("common");
  return (
    <ScreenWithHeader title={t("groups.discover")}>
      <DiscoverGroupsScreen />
    </ScreenWithHeader>
  );
}
