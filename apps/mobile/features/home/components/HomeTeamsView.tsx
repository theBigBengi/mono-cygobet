// features/home/components/HomeTeamsView.tsx
// Teams list from API. Loading/error/empty + ScrollView + RefreshControl. English only.

import React from "react";
import { View, StyleSheet } from "react-native";
import { AppText, Screen } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useTeamsQuery } from "@/domains/teams/teams.hooks";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import { TeamListItem } from "./TeamListItem";

export function HomeTeamsView() {
  const { theme } = useTheme();
  const { data, isLoading, error, refetch } = useTeamsQuery({
    page: 1,
    perPage: 20,
  });

  if (isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <QueryLoadingView message="Loading teams…" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <QueryErrorView
          message="Failed to load teams"
          onRetry={() => refetch()}
        />
      </View>
    );
  }

  const teams = data?.data ?? [];

  if (teams.length === 0) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <Screen>
          <View style={styles.emptyContainer}>
            <AppText variant="title" style={styles.emptyTitle}>
              No teams found
            </AppText>
            <AppText variant="body" color="secondary" style={styles.emptySubtitle}>
              There are no teams to display.
            </AppText>
          </View>
        </Screen>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Screen scroll onRefresh={async () => { await refetch(); }}>
        {teams.map((team) => (
          <TeamListItem key={team.id} team={team} />
        ))}
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
});
