// features/groups/group-list/screens/GroupsSearchScreen.tsx
// Search screen: browse public groups + join with code.
// - Public groups shown immediately on open
// - Debounced search (min 3 chars) filters public groups from server
// - Join with Code quick action always visible at top

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AppText, Button, Card, GroupAvatar } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useDebounce } from "@/hooks/useDebounce";
import {
  usePublicGroupsQuery,
  useJoinPublicGroupMutation,
} from "@/domains/groups";
import type { ApiPublicGroupItem } from "@repo/types";

const PER_PAGE = 20;

function getInitials(name: string): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function GroupsSearchScreen() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);
  const trimmedSearch = debouncedSearch.trim();
  const searchParam = trimmedSearch.length >= 3 ? trimmedSearch : undefined;

  const [page, setPage] = useState(1);
  const [accumulated, setAccumulated] = useState<ApiPublicGroupItem[]>([]);

  const { data, isLoading, isFetching, error, refetch } = usePublicGroupsQuery({
    page,
    perPage: PER_PAGE,
    search: searchParam,
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
  }, [searchParam]);

  // Auto-focus on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleJoinWithCode = useCallback(() => {
    router.push("/groups/join");
  }, [router]);

  const handleClear = useCallback(() => {
    setSearchInput("");
    inputRef.current?.focus();
  }, []);

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

  const isSearching = !!searchParam && isFetching;

  const renderItem = useCallback(
    ({ item }: { item: ApiPublicGroupItem }) => (
      <PublicGroupRow
        group={item}
        onJoinSuccess={() => router.replace(`/groups/${item.id}`)}
      />
    ),
    [router],
  );

  const keyExtractor = useCallback(
    (item: ApiPublicGroupItem) => String(item.id),
    [],
  );

  const listHeader = (
    <View style={styles.listHeaderContainer}>
      {/* Join with Code quick action */}
      <Pressable
        onPress={handleJoinWithCode}
        style={({ pressed }) => [
          styles.quickAction,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
          pressed && { opacity: 0.7 },
        ]}
      >
        <View
          style={[
            styles.quickActionIcon,
            { backgroundColor: theme.colors.primary + "15" },
          ]}
        >
          <Ionicons name="key-outline" size={20} color={theme.colors.primary} />
        </View>
        <View style={styles.quickActionText}>
          <AppText variant="body" style={{ fontWeight: "600" }}>
            {t("groups.joinWithCode")}
          </AppText>
          <AppText variant="caption" color="secondary">
            {t("groups.joinGroup")}
          </AppText>
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={theme.colors.textSecondary}
        />
      </Pressable>
    </View>
  );

  return (
    <View
      style={[styles.root, { backgroundColor: theme.colors.background }]}
    >
      {/* Search header */}
      <View style={[styles.searchHeader, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={({ pressed }) => [
            styles.backButton,
            pressed && { opacity: 0.5 },
          ]}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.colors.textPrimary}
          />
        </Pressable>
        <View
          style={[
            styles.searchInputContainer,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Ionicons
            name="search"
            size={18}
            color={theme.colors.textSecondary}
          />
          <TextInput
            ref={inputRef}
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder={t("discover.searchPlaceholder")}
            placeholderTextColor={theme.colors.textSecondary}
            returnKeyType="search"
            autoCorrect={false}
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
          />
          {isSearching && (
            <ActivityIndicator
              size="small"
              color={theme.colors.textSecondary}
            />
          )}
          {searchInput.length > 0 && !isSearching && (
            <Pressable
              onPress={handleClear}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={theme.colors.textSecondary}
              />
            </Pressable>
          )}
        </View>
      </View>

      {/* Public groups list */}
      {isLoading && page === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={accumulated}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={listHeader}
          contentContainerStyle={[
            styles.listContent,
            { paddingHorizontal: theme.spacing.md },
          ]}
          ListEmptyComponent={
            !isFetching ? (
              <View style={styles.emptyResults}>
                <Ionicons
                  name="search-outline"
                  size={48}
                  color={theme.colors.textSecondary}
                  style={{ marginBottom: 12, opacity: 0.5 }}
                />
                <AppText variant="body" color="secondary">
                  {searchParam
                    ? t("discover.noResults")
                    : t("discover.noResults")}
                </AppText>
              </View>
            ) : null
          }
          ListFooterComponent={
            hasMore ? (
              <View style={styles.footer}>
                {isFetching ? (
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
    </View>
  );
}

// ── Public Group Row ────────────────────────────────────────────────────

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
  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  backButton: {
    padding: 4,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
  },
  listHeaderContainer: {
    paddingTop: 4,
    paddingBottom: 12,
    gap: 10,
  },
  quickAction: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  quickActionText: {
    flex: 1,
    gap: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyResults: {
    paddingVertical: 48,
    alignItems: "center",
  },
  footer: {
    alignItems: "center",
    padding: 16,
  },
  card: {
    padding: 12,
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
