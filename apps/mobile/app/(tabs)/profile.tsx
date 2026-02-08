// app/(tabs)/profile.tsx
// Profile tab - displays user stats (overall, badges, form, groups).

import React from "react";
import { View, StyleSheet } from "react-native";
import { ProfileStatsScreen } from "@/features/profile";
import { useAuth } from "@/lib/auth/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";

export default function ProfileScreen() {
  const { user } = useAuth();

  if (!user?.id) {
    return <QueryLoadingView />;
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
