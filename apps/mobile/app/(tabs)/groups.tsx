// app/(tabs)/groups.tsx
// Groups tab - main screen
// - Shows list of user's groups.
// - Empty state when no groups exist.
// - Navigates to group details on press.

import React from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Screen, AppText, Button } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useMyGroupsQuery } from "@/domains/groups";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import { GroupDraftCard } from "@/features/groups/group-list/components/GroupDraftCard";
import { GroupActiveCard } from "@/features/groups/group-list/components/GroupActiveCard";
import type { ApiGroupItem } from "@repo/types";

export default function GroupsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { data, isLoading, error, refetch } = useMyGroupsQuery();

  const handleJoinWithCode = () => {
    router.push("/groups/join");
  };

  const handleGroupPress = (groupId: number) => {
    // Navigate to group details - Stack screen at root level
    router.push(`/groups/${groupId}` as any);
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.root}>
        <QueryLoadingView message="Loading groups..." />
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.root}>
        <QueryErrorView message="Failed to load groups" />
      </View>
    );
  }

  const groups = data?.data || [];

  // Empty state
  if (groups.length === 0) {
    return (
      <View style={styles.root}>
        <Screen>
          <View style={styles.emptyContainer}>
            <AppText variant="title" style={styles.emptyTitle}>
              No groups yet
            </AppText>
            <AppText
              variant="body"
              color="secondary"
              style={styles.emptySubtitle}
            >
              You don&apos;t have any groups yet
            </AppText>
            <Button
              label="Join with code"
              variant="secondary"
              onPress={handleJoinWithCode}
              style={[styles.joinButton, { marginTop: theme.spacing.lg }]}
            />
          </View>
        </Screen>
      </View>
    );
  }

  // List state
  return (
    <View style={styles.root}>
      <Screen scroll onRefresh={async () => { await refetch(); }}>
        <View style={[styles.joinRow, { marginBottom: theme.spacing.md }]}>
          <Button
            label="Join with code"
            variant="secondary"
            onPress={handleJoinWithCode}
            style={styles.joinButton}
          />
        </View>
        {groups.map((group) => {
          if (group.status === "draft") {
            return (
              <GroupDraftCard
                key={group.id}
                group={group}
                onPress={() => handleGroupPress(group.id)}
              />
            );
          }
          return (
            <GroupActiveCard
              key={group.id}
              group={group}
              onPress={() => handleGroupPress(group.id)}
            />
          );
        })}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyTitle: {
    marginBottom: 12,
    textAlign: "center",
  },
  emptySubtitle: {
    textAlign: "center",
  },
  joinRow: {
    width: "100%",
  },
  joinButton: {
    width: "100%",
  },
});
