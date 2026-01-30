// features/groups/invite/screens/GroupInviteScreen.tsx
// Screen component for group invite (placeholder: title only).

import React from "react";
import { View, StyleSheet } from "react-native";
import { Screen, AppText } from "@/components/ui";

interface GroupInviteScreenProps {
  groupId: number | null;
}

/**
 * GroupInviteScreen component
 *
 * Placeholder screen for group invite. Currently displays only a title.
 */
export function GroupInviteScreen({ groupId }: GroupInviteScreenProps) {
  return (
    <Screen>
      <View style={styles.container}>
        <AppText variant="title" style={styles.title}>
          Invite
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontWeight: "600",
  },
});
