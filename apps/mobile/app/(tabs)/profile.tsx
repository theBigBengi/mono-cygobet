// app/(tabs)/profile.tsx
// Profile tab - displays user stats (overall, badges, form, groups).

import React from "react";
import { View, StyleSheet } from "react-native";
import { ProfileStatsScreen } from "@/features/profile/stats/screens/ProfileStatsScreen";
import { useAuth } from "@/lib/auth/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function ProfileScreen() {
  const { user } = useAuth();

  if (!user?.id) {
    return null;
  }

  return (
    <ErrorBoundary feature="profile">
      <View style={styles.root}>
        <ProfileStatsScreen userId={user.id} />
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
