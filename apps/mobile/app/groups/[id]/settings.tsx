// app/groups/[id]/settings.tsx
// Group settings screen route.

import { GroupSettingsScreen } from "@/features/groups/group-settings/GroupSettingsScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function GroupSettingsRoute() {
  return (
    <ErrorBoundary feature="group-settings">
      <GroupSettingsScreen />
    </ErrorBoundary>
  );
}
