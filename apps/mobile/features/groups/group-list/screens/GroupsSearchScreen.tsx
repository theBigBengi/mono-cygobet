// features/groups/group-list/screens/GroupsSearchScreen.tsx
// Full search/discover screen for groups.
// - Auto-focused search input with debounce
// - Quick actions (Browse Public, Join with Code) when input empty
// - Filtered group results when searching

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
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useMyGroupsQuery,
  useUnreadCountsQuery,
  useUnreadActivityCountsQuery,
} from "@/domains/groups";
import { GroupCard } from "@/features/groups/group-list/components";
import { useGroupFilter } from "@/features/groups/group-list/hooks";
import type { ApiGroupItem } from "@repo/types";

export function GroupsSearchScreen() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);
  const trimmedSearch = debouncedSearch.trim();
  const searchParam = trimmedSearch.length >= 2 ? trimmedSearch : undefined;

  const { data, isFetching } = useMyGroupsQuery(searchParam);
  const isSearching = !!searchParam && isFetching;
  const { data: unreadData } = useUnreadCountsQuery();
  const unreadCounts = unreadData?.data ?? {};
  const { data: unreadActivityData } = useUnreadActivityCountsQuery();
  const unreadActivityCounts = unreadActivityData?.data ?? {};

  const groups = data?.data || [];
  const { filteredGroups } = useGroupFilter(groups);

  // Auto-focus on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleGroupPress = useCallback(
    (groupId: number) => {
      router.push(`/groups/${groupId}` as any);
    },
    [router],
  );

  const handleBrowsePublic = useCallback(() => {
    router.push("/groups/discover");
  }, [router]);

  const handleJoinWithCode = useCallback(() => {
    router.push("/groups/join");
  }, [router]);

  const handleClear = useCallback(() => {
    setSearchInput("");
    inputRef.current?.focus();
  }, []);

  const renderGroupItem = useCallback(
    ({ item }: { item: ApiGroupItem }) => (
      <GroupCard
        group={item}
        onPress={handleGroupPress}
        unreadCount={unreadCounts[String(item.id)] ?? 0}
        unreadActivityCount={unreadActivityCounts[String(item.id)] ?? 0}
      />
    ),
    [handleGroupPress, unreadCounts, unreadActivityCounts],
  );

  const keyExtractor = useCallback(
    (item: ApiGroupItem) => String(item.id),
    [],
  );

  const showQuickActions = !searchParam;
  const showResults = !!searchParam;

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
            placeholder={t("groups.searchPlaceholder")}
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

      {/* Quick actions — visible when not searching */}
      {showQuickActions && (
        <View style={styles.quickActionsContainer}>
          <AppText
            variant="caption"
            color="secondary"
            style={styles.quickActionsTitle}
          >
            {t("groups.quickActions")}
          </AppText>
          <Pressable
            onPress={handleBrowsePublic}
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
              <Ionicons
                name="globe-outline"
                size={20}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.quickActionText}>
              <AppText variant="body" style={{ fontWeight: "600" }}>
                {t("groups.browsePublic")}
              </AppText>
              <AppText variant="caption" color="secondary">
                {t("groups.browsePublicGroups")}
              </AppText>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={theme.colors.textSecondary}
            />
          </Pressable>
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
              <Ionicons
                name="key-outline"
                size={20}
                color={theme.colors.primary}
              />
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
      )}

      {/* Search results */}
      {showResults && (
        <FlatList
          data={filteredGroups}
          keyExtractor={keyExtractor}
          renderItem={renderGroupItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.resultsList}
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
                  {t("groups.noGroupsInFilter")}
                </AppText>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

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
  quickActionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  quickActionsTitle: {
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.5,
    marginBottom: 2,
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
  resultsList: {
    paddingTop: 8,
  },
  emptyResults: {
    paddingVertical: 48,
    alignItems: "center",
  },
});
