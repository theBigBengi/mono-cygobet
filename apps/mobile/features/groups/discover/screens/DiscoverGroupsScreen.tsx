// features/groups/discover/screens/DiscoverGroupsScreen.tsx
// Browse and join public groups with search and pagination.

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  FlatList,
  ListRenderItem,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Screen, AppText, Button, Card } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import {
  usePublicGroupsQuery,
  useJoinPublicGroupMutation,
} from "@/domains/groups";
import type { ApiPublicGroupItem } from "@repo/types";

const PER_PAGE = 20;

export function DiscoverGroupsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [inputValue, setInputValue] = useState("");
  const [search, setSearch] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [accumulated, setAccumulated] = useState<ApiPublicGroupItem[]>([]);

  const { data, isLoading, error, refetch } = usePublicGroupsQuery({
    page,
    perPage: PER_PAGE,
    search,
  });

  // Accumulate items when response changes; use response page to avoid double-append
  useEffect(() => {
    if (!data?.data) return;
    if (data.pagination.page === 1) {
      setAccumulated(data.data);
    } else {
      setAccumulated((prev) => [...prev, ...data.data]);
    }
  }, [data]);

  // Reset page and accumulated list when search changes
  useEffect(() => {
    setPage(1);
    setAccumulated([]);
  }, [search]);

  const handleSubmitSearch = useCallback(() => {
    setSearch(inputValue.trim() || undefined);
    setPage(1);
  }, [inputValue]);

  const loadMore = useCallback(() => {
    if (!data?.pagination) return;
    const { page: currentPage, totalPages } = data.pagination;
    if (currentPage < totalPages) {
      setPage((p) => p + 1);
    }
  }, [data?.pagination]);

  const hasMore =
    data?.pagination != null &&
    data.pagination.page < data.pagination.totalPages;

  if (error) {
    return (
      <Screen>
        <QueryErrorView
          message="Failed to load public groups"
          onRetry={() => refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={[styles.searchRow, { padding: theme.spacing.md }]}>
          <TextInput
            value={inputValue}
            onChangeText={setInputValue}
            onSubmitEditing={handleSubmitSearch}
            placeholder="Search by group name"
            placeholderTextColor={theme.colors.textSecondary}
            returnKeyType="search"
            style={[
              styles.searchInput,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.textPrimary,
              },
            ]}
          />
          <Button
            label="Search"
            variant="secondary"
            onPress={handleSubmitSearch}
            style={styles.searchButton}
          />
        </View>

        {isLoading && page === 1 ? (
          <QueryLoadingView message="Loading groups..." />
        ) : (
          <FlatList
            data={accumulated}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <PublicGroupRow
                group={item}
                onJoinSuccess={() => router.replace(`/groups/${item.id}`)}
              />
            )}
            contentContainerStyle={[
              styles.listContent,
              { paddingHorizontal: theme.spacing.md },
            ]}
            ListEmptyComponent={
              <View style={styles.empty}>
                <AppText variant="body" color="secondary">
                  No public groups found
                </AppText>
              </View>
            }
            ListFooterComponent={
              hasMore ? (
                <View style={[styles.footer, { padding: theme.spacing.md }]}>
                  {isLoading ? (
                    <AppText variant="caption" color="secondary">
                      Loading...
                    </AppText>
                  ) : (
                    <Button
                      label="Load more"
                      variant="secondary"
                      onPress={loadMore}
                    />
                  )}
                </View>
              ) : null
            }
          />
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

interface PublicGroupRowProps {
  group: ApiPublicGroupItem;
  onJoinSuccess: () => void;
}

function PublicGroupRow({ group, onJoinSuccess }: PublicGroupRowProps) {
  const { theme } = useTheme();
  const joinMutation = useJoinPublicGroupMutation(group.id);

  const handleJoin = () => {
    joinMutation.mutate(undefined, {
      onSuccess: () => {
        onJoinSuccess();
      },
    });
  };

  const memberLabel =
    group.maxMembers != null
      ? `${group.memberCount} / ${group.maxMembers} members`
      : `${group.memberCount} members`;

  return (
    <Card style={[styles.card, { marginBottom: theme.spacing.sm }]}>
      <View style={styles.cardContent}>
        <View style={styles.cardMain}>
          <AppText variant="body" style={styles.groupName}>
            {group.name}
          </AppText>
          <AppText variant="caption" color="secondary">
            {memberLabel} · {group.totalFixtures} games
          </AppText>
          {group.creatorUsername != null && (
            <AppText variant="caption" color="secondary">
              by @{group.creatorUsername}
            </AppText>
          )}
        </View>
        <Button
          label={joinMutation.isPending ? "Joining..." : "Join"}
          onPress={handleJoin}
          disabled={joinMutation.isPending}
          style={styles.joinButton}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  searchButton: {
    minWidth: 80,
  },
  listContent: {
    paddingBottom: 24,
  },
  empty: {
    padding: 24,
    alignItems: "center",
  },
  footer: {
    alignItems: "center",
  },
  card: {
    padding: 12,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardMain: {
    flex: 1,
    marginRight: 12,
  },
  groupName: {
    fontWeight: "600",
    marginBottom: 4,
  },
  joinButton: {
    minWidth: 80,
  },
});
