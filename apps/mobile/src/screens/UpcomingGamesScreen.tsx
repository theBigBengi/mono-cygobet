import React from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useUpcomingFixtures } from "@/hooks/use-upcoming-fixtures";

type RowItem = {
  id: string | number;
  kickoffAt: string;
  league: { name: string };
  homeTeam: { name: string };
  awayTeam: { name: string };
};

function formatKickoffLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  // Force 24h time while keeping the device locale + timezone.
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function SkeletonRow() {
  return (
    <View style={styles.skeletonRow}>
      <View style={[styles.skeletonBlock, { width: "45%" }]} />
      <View style={[styles.skeletonBlock, { width: "35%" }]} />
      <View style={[styles.skeletonBlock, { width: "75%" }]} />
    </View>
  );
}

function ErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <ThemedView style={styles.errorCard}>
      <ThemedText type="defaultSemiBold">Failed to load upcoming games</ThemedText>
      <Pressable style={styles.retryButton} onPress={onRetry}>
        <ThemedText type="defaultSemiBold" style={styles.retryButtonText}>
          Retry
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

function FixtureRow({ item }: { item: RowItem }) {
  return (
    <ThemedView style={styles.row}>
      <ThemedText type="defaultSemiBold" style={styles.leagueName}>
        {item.league?.name ?? "Unknown league"}
      </ThemedText>
      <ThemedText style={styles.kickoff}>{formatKickoffLocal(item.kickoffAt)}</ThemedText>
      <ThemedText style={styles.matchup}>
        {item.homeTeam?.name ?? "Home"} vs {item.awayTeam?.name ?? "Away"}
      </ThemedText>
    </ThemedView>
  );
}

export function UpcomingGamesScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const q = useUpcomingFixtures({ perPage: 30 });

  const items: RowItem[] = React.useMemo(() => {
    const pages = q.data?.pages ?? [];
    return pages.flatMap((p) => p.data ?? []);
  }, [q.data]);

  const showSkeleton = q.isLoading && items.length === 0;
  const showError = q.isError && items.length === 0;

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <ThemedText type="title">Upcoming Games</ThemedText>
      </View>

      {showError ? (
        <ErrorCard onRetry={() => q.refetch()} />
      ) : (
        <FlatList
          data={showSkeleton ? Array.from({ length: 8 }).map((_, i) => ({ id: `s-${i}` })) : items}
          keyExtractor={(it: any) => String(it.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) =>
            showSkeleton ? (
              <SkeletonRow />
            ) : (
              <FixtureRow item={item as RowItem} />
            )
          }
          onEndReachedThreshold={0.3}
          onEndReached={() => {
            if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage();
          }}
          ListFooterComponent={
            q.isFetchingNextPage ? (
              <View style={styles.footer}>
                <SkeletonRow />
              </View>
            ) : null
          }
          refreshing={q.isRefetching && !q.isFetchingNextPage}
          onRefresh={() => q.refetch()}
          ListEmptyComponent={
            !showSkeleton && !q.isLoading ? (
              <ThemedView style={styles.emptyState}>
                <ThemedText>No upcoming games</ThemedText>
              </ThemedView>
            ) : null
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  row: {
    borderRadius: 12,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(128,128,128,0.25)",
  },
  leagueName: { marginBottom: 4 },
  kickoff: { opacity: 0.8, marginBottom: 6 },
  matchup: { fontSize: 16 },
  skeletonRow: {
    borderRadius: 12,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(128,128,128,0.25)",
    gap: 10,
  },
  skeletonBlock: {
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(128,128,128,0.22)",
  },
  errorCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,0,0,0.25)",
    gap: 10,
  },
  retryButton: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#0a7ea4",
  },
  retryButtonText: { color: "white" },
  emptyState: {
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(128,128,128,0.25)",
  },
  footer: { paddingTop: 10 },
});


