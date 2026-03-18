// features/groups/discover/screens/DiscoverGroupsScreen.tsx
// Browse and join public groups with search and pagination.

import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AppText, Button, Card, GroupAvatar } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { getInitials } from "@/utils/string";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import {
  usePublicGroupsQuery,
  useJoinPublicGroupMutation,
} from "@/domains/groups";
import type { ApiPublicGroupItem } from "@repo/types";

const PER_PAGE = 20;

export function DiscoverGroupsScreen() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { theme } = useTheme();
  const [inputValue, setInputValue] = useState("");
  const [search, setSearch] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [accumulated, setAccumulated] = useState<ApiPublicGroupItem[]>([]);

  const { data, isLoading, error, refetch, isFetching } = usePublicGroupsQuery({
    page,
    perPage: PER_PAGE,
    search,
  });

  // Accumulate items when response changes
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

  const handleClear = useCallback(() => {
    setInputValue("");
    setSearch(undefined);
    setPage(1);
  }, []);

  const loadMore = useCallback(() => {
    if (!data?.pagination) return;
    const { page: currentPage, totalPages } = data.pagination;
    if (currentPage < totalPages) {
      setPage((p) => p + 1);
    }
  }, [data?.pagination]);

  const renderGroupItem = useCallback(
    ({ item }: { item: (typeof accumulated)[0] }) => (
      <PublicGroupRow
        group={item}
        onJoinSuccess={() => router.replace(`/groups/${item.id}`)}
      />
    ),
    [router],
  );

  const hasMore =
    data?.pagination != null &&
    data.pagination.page < data.pagination.totalPages;

  if (error) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <QueryErrorView
          message={t("discover.failedLoadPublicGroups")}
          onRetry={() => refetch()}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.root, { backgroundColor: theme.colors.background }]}
    >
      {/* Search bar */}
      <View style={[styles.searchRow, { padding: theme.spacing.md }]}>
        <View
          style={[
            styles.searchInputContainer,
            {
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
          <TextInput
            value={inputValue}
            onChangeText={setInputValue}
            onSubmitEditing={handleSubmitSearch}
            placeholder={t("discover.searchPlaceholder")}
            placeholderTextColor={theme.colors.textSecondary}
            returnKeyType="search"
            autoCorrect={false}
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
          />
          {isFetching && search && (
            <ActivityIndicator size="small" color={theme.colors.textSecondary} />
          )}
          {inputValue.length > 0 && !isFetching && (
            <Pressable
              onPress={handleClear}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      {isLoading && page === 1 ? (
        <QueryLoadingView message={t("groups.loadingGroups")} />
      ) : (
        <FlatList
          data={accumulated}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderGroupItem}
          removeClippedSubviews={Platform.OS === "android"}
          maxToRenderPerBatch={10}
          initialNumToRender={10}
          windowSize={5}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.listContent,
            { paddingHorizontal: theme.spacing.md },
          ]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <AppText variant="body" color="secondary">
                {t("discover.noResults")}
              </AppText>
            </View>
          }
          ListFooterComponent={
            hasMore ? (
              <View style={[styles.footer, { padding: theme.spacing.md }]}>
                {isLoading ? (
                  <AppText variant="caption" color="secondary">
                    {t("common.loading")}
                  </AppText>
                ) : (
                  <Button
                    label={t("discover.loadMore")}
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
  );
}

interface PublicGroupRowProps {
  group: ApiPublicGroupItem;
  onJoinSuccess: () => void;
}

const PublicGroupRow = React.memo(function PublicGroupRow({
  group,
  onJoinSuccess,
}: PublicGroupRowProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const joinMutation = useJoinPublicGroupMutation(group.id);

  const handleJoin = () => {
    joinMutation.mutate(undefined, {
      onSuccess: () => {
        onJoinSuccess();
      },
    });
  };

  const initials = getInitials(group.name);
  const avatarValue = String(group.id % 8);

  const memberLabel =
    group.maxMembers != null
      ? t("discover.membersWithMax", {
          count: group.memberCount,
          max: group.maxMembers,
        })
      : t("discover.membersCount", { count: group.memberCount });

  return (
    <Card style={[styles.card, { marginBottom: theme.spacing.sm }]}>
      <View style={styles.cardContent}>
        <GroupAvatar
          avatarType="gradient"
          avatarValue={avatarValue}
          initials={initials}
          size={48}
          borderRadius={12}
        />
        <View style={styles.cardMain}>
          <View style={styles.nameRow}>
            {group.isOfficial && (
              <View style={styles.officialBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#D4A017" />
              </View>
            )}
            <AppText variant="body" style={styles.groupName} numberOfLines={1}>
              {group.name}
            </AppText>
          </View>
          <AppText variant="caption" color="secondary">
            {memberLabel} · {t("discover.gamesCount", { count: group.totalFixtures })}
          </AppText>
          {group.badge && (
            <AppText variant="caption" color="secondary">
              {group.badge.icon} {group.badge.name}
            </AppText>
          )}
          {group.creatorUsername != null && !group.isOfficial && (
            <AppText variant="caption" color="secondary">
              {t("discover.createdBy", { username: group.creatorUsername })}
            </AppText>
          )}
          {group.isOfficial && (
            <AppText
              variant="caption"
              style={{ color: "#D4A017", fontWeight: "600" }}
            >
              {t("discover.officialGroup")}
            </AppText>
          )}
        </View>
        <Button
          label={joinMutation.isPending ? t("groups.joining") : t("discover.join")}
          onPress={handleJoin}
          disabled={joinMutation.isPending}
          style={styles.joinButton}
        />
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
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
    padding: 14,
    borderRadius: 18,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardMain: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  officialBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#D4A01720",
    alignItems: "center",
    justifyContent: "center",
  },
  groupName: {
    fontWeight: "600",
    flex: 1,
  },
  joinButton: {
    minWidth: 70,
  },
});
