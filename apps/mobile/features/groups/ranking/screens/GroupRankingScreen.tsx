// features/groups/ranking/screens/GroupRankingScreen.tsx
// Screen component for group ranking (placeholder: title only).

import React from "react";
import { View, StyleSheet } from "react-native";
import { Screen, AppText } from "@/components/ui";

interface GroupRankingScreenProps {
  groupId: number | null;
}

/**
 * GroupRankingScreen component
 *
 * Placeholder screen for group ranking. Currently displays only a title.
 */
export function GroupRankingScreen({ groupId }: GroupRankingScreenProps) {
  return (
    <Screen>
      <View style={styles.container}>
        <AppText variant="title" style={styles.title}>
          Ranking
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
