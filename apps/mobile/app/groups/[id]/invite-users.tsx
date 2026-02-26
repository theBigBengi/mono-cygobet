// app/groups/[id]/invite-users.tsx
// Redirect to the main invite screen (search is now inline there).

import { Redirect, useLocalSearchParams } from "expo-router";

export default function InviteUsersRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={`/groups/${id}/invite`} />;
}
