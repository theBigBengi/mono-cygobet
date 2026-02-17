// app/invites/index.tsx
// Invitations inbox — list and respond to group invites.

import React from "react";
import { useTranslation } from "react-i18next";
import { ScreenWithHeader } from "@/components/ui";
import { InvitesInboxScreen } from "@/features/invites";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useMyInvitesQuery } from "@/domains/invites";

export default function InvitesRoute() {
  return (
    <ErrorBoundary feature="invites">
      <InvitesContent />
    </ErrorBoundary>
  );
}

function InvitesContent() {
  const { t } = useTranslation("common");
  const { data } = useMyInvitesQuery({ status: "pending" });
  const pendingCount = data?.data?.pendingCount ?? 0;
  const title =
    pendingCount > 0
      ? t("invites.invitationsWithCount", { count: pendingCount })
      : t("invites.invitations");

  return (
    <ScreenWithHeader title={title}>
      <InvitesInboxScreen />
    </ScreenWithHeader>
  );
}
