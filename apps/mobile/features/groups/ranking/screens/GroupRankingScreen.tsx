// features/groups/ranking/screens/GroupRankingScreen.tsx
// Screen component for group ranking.

import React from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
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
  groupId,
}: {
  item: ApiRankingItem;
  isCurrentUser: boolean;
  groupId: number | null;
}) {
  const { theme } = useTheme();
  const router = useRouter();

  const onPress = () => {
    if (groupId == null) return;
    router.push(
      `/groups/${groupId}/member/${item.userId}?username=${encodeURIComponent(item.username ?? "")}&rank=${item.rank}&totalPoints=${item.totalPoints}&correctScoreCount=${item.correctScoreCount}&predictionCount=${item.predictionCount}` as any
    );
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.sm, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Card
        style={[
          styles.card,
          {
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
    </Pressable>
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
            groupId={groupId}
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
