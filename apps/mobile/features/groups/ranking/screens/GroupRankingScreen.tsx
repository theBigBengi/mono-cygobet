// features/groups/ranking/screens/GroupRankingScreen.tsx
// Screen component for group ranking.

import React from "react";
import {
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { Screen, Card, AppText, Row } from "@/components/ui";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import { useGroupRankingQuery } from "@/domains/groups";
import { useAuth } from "@/lib/auth/useAuth";
import { useTheme } from "@/lib/theme";
import type { ApiRankingItem } from "@repo/types";

interface GroupRankingScreenProps {
  groupId: number | null;
}

function RankingRow({
  item,
  isCurrentUser,
}: {
  item: ApiRankingItem;
  isCurrentUser: boolean;
}) {
  const { theme } = useTheme();

  return (
    <Card
      style={[
        styles.card,
        {
          marginHorizontal: theme.spacing.md,
          marginBottom: theme.spacing.sm,
          borderWidth: isCurrentUser ? 2 : 1,
          borderColor: isCurrentUser
            ? theme.colors.primary
            : theme.colors.border,
        },
      ]}
    >
      <Row gap={theme.spacing.md} style={styles.row}>
        <AppText variant="body" style={styles.rank}>
          {item.rank}
        </AppText>
        <AppText
          variant="body"
          numberOfLines={1}
          style={styles.username}
        >
          {item.username ?? "—"}
        </AppText>
        <AppText variant="body" style={styles.points}>
          {item.totalPoints}
        </AppText>
      </Row>
      <AppText variant="caption" color="secondary" style={styles.stats}>
        {item.correctScoreCount} exact / {item.predictionCount} predictions
      </AppText>
    </Card>
  );
}

/**
 * GroupRankingScreen component
 *
 * Fetches and displays group ranking. Shows loading and error states.
 * Current user row is highlighted. Pull-to-refresh supported.
 */
export function GroupRankingScreen({ groupId }: GroupRankingScreenProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useGroupRankingQuery(groupId);

  if (isLoading) {
    return (
      <Screen>
        <QueryLoadingView message="Loading ranking..." />
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen>
        <QueryErrorView
          message="Failed to load ranking"
          onRetry={() => refetch()}
        />
      </Screen>
    );
  }

  const items = data.data;

  return (
    <Screen>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.userId)}
        renderItem={({ item }) => (
          <RankingRow
            item={item}
            isCurrentUser={user?.id != null && item.userId === user.id}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: theme.spacing.md, paddingBottom: theme.spacing.md },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={theme.colors.primary}
            colors={Platform.OS === "android" ? [theme.colors.primary] : undefined}
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
  },
  card: {
    minHeight: 56,
  },
  row: {
    flex: 1,
  },
  rank: {
    fontWeight: "700",
    minWidth: 28,
  },
  username: {
    flex: 1,
    fontWeight: "500",
  },
  points: {
    fontSize: 18,
    fontWeight: "700",
  },
  stats: {
    marginTop: 4,
  },
});
