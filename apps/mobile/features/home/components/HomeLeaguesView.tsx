// features/home/components/HomeLeaguesView.tsx
// Leagues list from API. Loading/error/empty + ScrollView + RefreshControl. English only.

import React from "react";
import { View, StyleSheet } from "react-native";
import { AppText, Screen } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useLeaguesQuery } from "@/domains/leagues/leagues.hooks";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import { LeagueListItem } from "./LeagueListItem";

export function HomeLeaguesView() {
  const { theme } = useTheme();
  const { data, isLoading, error, refetch } = useLeaguesQuery({
    page: 1,
    perPage: 20,
  });

  if (isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <QueryLoadingView message="Loading leagues…" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <QueryErrorView
          message="Failed to load leagues"
          onRetry={() => refetch()}
        />
      </View>
    );
  }

  const leagues = data?.data ?? [];

  if (leagues.length === 0) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <Screen>
          <View style={styles.emptyContainer}>
            <AppText variant="title" style={styles.emptyTitle}>
              No leagues found
            </AppText>
            <AppText variant="body" color="secondary" style={styles.emptySubtitle}>
              There are no leagues to display.
            </AppText>
          </View>
        </Screen>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Screen scroll onRefresh={async () => { await refetch(); }}>
        {leagues.map((league) => (
          <LeagueListItem key={league.id} league={league} />
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
