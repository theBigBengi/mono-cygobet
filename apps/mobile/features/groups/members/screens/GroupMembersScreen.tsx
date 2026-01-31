// features/groups/members/screens/GroupMembersScreen.tsx
// Screen component for group members list.

import React from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Screen, Card, AppText, Row } from "@/components/ui";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import { useGroupMembersQuery } from "@/domains/groups";
import { useAuth } from "@/lib/auth/useAuth";
import { useTheme } from "@/lib/theme";
import type { ApiGroupMemberItem } from "@repo/types";
import { formatDate } from "@/utils/date";

interface GroupMembersScreenProps {
  groupId: number | null;
}

function MemberRow({
  item,
  isCurrentUser,
  index,
  groupId,
}: {
  item: ApiGroupMemberItem;
  isCurrentUser: boolean;
  index: number;
  groupId: number | null;
}) {
  const { theme } = useTheme();
  const router = useRouter();

  const displayName = item.username ?? `Player #${index + 1}`;
  const joinedAtFormatted = item.joinedAt ? formatDate(item.joinedAt) : "";

  const onPress = () => {
    if (groupId != null && item.userId) {
      router.push(
        `/groups/${groupId}/member/${item.userId}?username=${encodeURIComponent(displayName)}` as any
      );
    }
  };

  return (
    <Pressable
      onPress={groupId != null ? onPress : undefined}
      style={({ pressed }) => [
        { marginBottom: 12, opacity: pressed ? 0.8 : 1 },
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
        <AppText
          variant="body"
          numberOfLines={1}
          style={styles.username}
        >
          {displayName}
        </AppText>
        <AppText variant="caption" color="secondary" style={styles.roleBadge}>
          {item.role}
        </AppText>
      </Row>
      {joinedAtFormatted && (
        <AppText variant="caption" color="secondary" style={styles.joinedAt}>
          Joined {joinedAtFormatted}
        </AppText>
      )}
      </Card>
    </Pressable>
  );
}

/**
 * GroupMembersScreen component
 *
 * Fetches and displays group members. Shows loading and error states.
 * Current user row is highlighted. Pull-to-refresh supported.
 */
export function GroupMembersScreen({ groupId }: GroupMembersScreenProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useGroupMembersQuery(groupId);

  if (isLoading) {
    return (
      <Screen>
        <QueryLoadingView message="Loading members..." />
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen>
        <QueryErrorView
          message="Failed to load members"
          onRetry={() => refetch()}
        />
      </Screen>
    );
  }

  const items = data.data;

  return (
    <View  >
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.userId)}
        renderItem={({ item, index }) => (
          <MemberRow
            item={item}
            isCurrentUser={user?.id != null && item.userId === user.id}
            index={index}
            groupId={groupId}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          { paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.md },
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
    </View>
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
  username: {
    flex: 1,
    fontWeight: "500",
  },
  roleBadge: {
    textTransform: "capitalize",
  },
  joinedAt: {
    marginTop: 4,
  },
});
