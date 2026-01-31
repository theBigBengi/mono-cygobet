// app/groups/[id]/invite.tsx
// Route wrapper for group invite screen.
// Uses custom header with explicit back button so back works on iOS.

import React from "react";
import { View, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { GroupGamesHeader } from "@/features/groups/predictions/components/GroupGamesHeader";
import { GroupInviteScreen } from "@/features/groups/invite";

export default function GroupInviteRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const groupId =
    params.id && !isNaN(Number(params.id)) ? Number(params.id) : null;

  return (
    <View style={styles.container}>
      <GroupGamesHeader backOnly onBack={() => router.back()} />
      <View style={styles.content}>
        <GroupInviteScreen groupId={groupId} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
});
