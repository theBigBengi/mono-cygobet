// app/(tabs)/groups.tsx
// Groups tab - main screen
// - Shows list of user's groups with filter tabs: All, Attention, Active, Drafts, Ended.
// - Empty state when no groups exist.
// - Navigates to group details on press.

import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Screen, AppText, Button } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useMyGroupsQuery, useUnreadCountsQuery } from "@/domains/groups";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import {
  GroupCard,
  GroupFilterTabs,
} from "@/features/groups/group-list/components";
import { useGroupFilter } from "@/features/groups/group-list/hooks";
import type { ApiGroupItem } from "@repo/types";
import { Ionicons } from "@expo/vector-icons";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function GroupsScreen() {
  return (
    <ErrorBoundary feature="groups-list">
      <GroupsContent />
    </ErrorBoundary>
  );
}

function GroupsContent() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, isLoading, error, refetch } = useMyGroupsQuery();
  const { data: unreadData, refetch: refetchUnread } = useUnreadCountsQuery();
  const unreadCounts = unreadData?.data ?? {};
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), refetchUnread()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetch, refetchUnread]);

  const handleCreateGroup = () => {
    router.push("/(tabs)/home" as any);
  };

  const handleJoinWithCode = () => {
    router.push("/groups/join");
  };

  const handleBrowsePublic = () => {
    router.push("/groups/discover");
  };

  const handleGroupPress = (groupId: number) => {
    router.push(`/groups/${groupId}` as any);
  };

  const groups = data?.data || [];
  const { selectedFilter, setSelectedFilter, filteredGroups, counts } =
    useGroupFilter(groups);

  // Loading state — skeleton
  if (isLoading) {
    return (
      <View style={styles.root}>
        <Screen
          scroll={false}
          contentContainerStyle={{
            alignItems: "stretch",
            flex: 1,
            padding: 0,
          }}
        >
          <View
            style={{
              paddingHorizontal: theme.spacing.md,
              paddingTop: theme.spacing.md,
            }}
          >
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.radius.md,
                  height: 120,
                  marginBottom: theme.spacing.sm,
                }}
              />
            ))}
          </View>
        </Screen>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.root}>
        <QueryErrorView
          message={t("groups.failedLoadGroups")}
          onRetry={() => refetch()}
        />
      </View>
    );
  }

  // Empty state
  if (groups.length === 0) {
    return (
      <View style={styles.root}>
        <Screen>
          <View style={styles.emptyContainer}>
            <AppText variant="title" style={styles.emptyTitle}>
              {t("groups.noGroupsYet")}
            </AppText>
            <AppText
              variant="body"
              color="secondary"
              style={styles.emptySubtitle}
            >
              {t("groups.noGroupsSubtitle")}
            </AppText>
            <Button
              label={t("groupCreation.createGroup")}
              variant="primary"
              onPress={handleCreateGroup}
              style={[
                styles.createGroupButton,
                { marginTop: theme.spacing.lg },
              ]}
            />
            <View
              style={[styles.secondaryActions, { marginTop: theme.spacing.xl }]}
            >
              <Pressable
                onPress={handleJoinWithCode}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={({ pressed }) => [
                  styles.secondaryAction,
                  pressed && styles.secondaryActionPressed,
                ]}
              >
                <AppText
                  variant="body"
                  color="secondary"
                  style={styles.secondaryActionText}
                >
                  {t("groups.joinWithCode")}
                </AppText>
              </Pressable>
              <AppText
                variant="body"
                color="secondary"
                style={styles.secondaryActionSeparator}
              >
                ·
              </AppText>
              <Pressable
                onPress={handleBrowsePublic}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={({ pressed }) => [
                  styles.secondaryAction,
                  pressed && styles.secondaryActionPressed,
                ]}
              >
                <AppText
                  variant="body"
                  color="secondary"
                  style={styles.secondaryActionText}
                >
                  {t("groups.browsePublicGroups")}
                </AppText>
              </Pressable>
            </View>
          </View>
        </Screen>
      </View>
    );
  }

  const tabBarHeight = 60 + insets.bottom;
  const tabBarMarginBottom = theme.spacing.sm;
  const totalTabBarSpace = tabBarHeight + tabBarMarginBottom;

  const renderHeader = () => (
    <View>
      <View style={[styles.actionRow, { paddingBottom: theme.spacing.md }]}>
        <Pressable
          onPress={handleJoinWithCode}
          style={[styles.iconButton, { backgroundColor: theme.colors.surface }]}
        >
          <Ionicons
            name="link-outline"
            size={20}
            color={theme.colors.primary}
          />
          <AppText variant="caption" style={{ color: theme.colors.primary }}>
            {t("groups.joinWithCode")}
          </AppText>
        </Pressable>
        <Pressable
          onPress={handleBrowsePublic}
          style={[styles.iconButton, { backgroundColor: theme.colors.surface }]}
        >
          <Ionicons
            name="search-outline"
            size={20}
            color={theme.colors.primary}
          />
          <AppText variant="caption" style={{ color: theme.colors.primary }}>
            {t("groups.browsePublic")}
          </AppText>
        </Pressable>
      </View>
      <GroupFilterTabs
        selectedFilter={selectedFilter}
        onFilterChange={setSelectedFilter}
        counts={counts}
      />
    </View>
  );

  const renderItem = ({ item }: { item: ApiGroupItem }) => (
    <GroupCard
      group={item}
      onPress={() => handleGroupPress(item.id)}
      unreadCount={unreadCounts[String(item.id)] ?? 0}
    />
  );

  return (
    <View style={styles.root}>
      <Screen
        scroll={false}
        contentContainerStyle={{ alignItems: "stretch", flex: 1, padding: 0 }}
      >
        <FlatList
          style={styles.list}
          data={filteredGroups}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <View style={styles.emptyFilter}>
              <AppText variant="body" color="secondary">
                {t("groups.noGroupsInFilter")}
              </AppText>
            </View>
          }
          contentContainerStyle={{
            paddingBottom: totalTabBarSpace + theme.spacing.md,
            paddingHorizontal: theme.spacing.md,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
              colors={
                Platform.OS === "android" ? [theme.colors.primary] : undefined
              }
            />
          }
        />
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  emptyFilter: {
    paddingVertical: 24,
    alignItems: "center",
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
  createGroupButton: {
    width: "100%",
  },
  secondaryActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  secondaryAction: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  secondaryActionPressed: {
    opacity: 0.7,
  },
  secondaryActionText: {
    textDecorationLine: "underline",
  },
  secondaryActionSeparator: {
    opacity: 0.6,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  iconButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
});
