// app/(tabs)/groups.tsx
// Groups tab - main screen
// - Shows list of user's groups with filter tabs: All, Attention, Active, Drafts, Ended.
// - Empty state when no groups exist.
// - Navigates to group details on press.

import React, { useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  RefreshControl,
  Platform,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { Screen, AppText, Button } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useMyGroupsQuery, useUnreadCountsQuery } from "@/domains/groups";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import {
  GroupCard,
  GroupFilterTabs,
  GroupsInfoSheet,
} from "@/features/groups/group-list/components";
import { useGroupFilter } from "@/features/groups/group-list/hooks";
import type { ApiGroupItem } from "@repo/types";
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
  const infoSheetRef = useRef<BottomSheetModal>(null);

  const handleOpenInfo = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    infoSheetRef.current?.present();
  }, []);

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

  // Build list data: header, tabs, then groups
  type ListItem =
    | { type: "header" }
    | { type: "tabs" }
    | { type: "group"; data: ApiGroupItem };

  const listData = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [
      { type: "header" },
      { type: "tabs" },
    ];
    filteredGroups.forEach((g) => items.push({ type: "group", data: g }));
    return items;
  }, [filteredGroups]);

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
          {/* Header skeleton */}
          <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
            <View style={{ width: 100, height: 28, backgroundColor: theme.colors.surface, borderRadius: 8 }} />
            <View style={{ width: 36, height: 36, backgroundColor: theme.colors.surface, borderRadius: 12 }} />
          </View>

          {/* Filter tabs skeleton */}
          <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
            {[80, 70, 60].map((w, i) => (
              <View key={i} style={{ width: w, height: 36, backgroundColor: theme.colors.surface, borderRadius: 10 }} />
            ))}
          </View>

          {/* Cards skeleton */}
          <View style={{ paddingTop: 12 }}>
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                style={{
                  marginHorizontal: 16,
                  marginBottom: 12,
                  backgroundColor: theme.colors.cardBackground,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  padding: 14,
                }}
              >
                {/* Top row skeleton */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: theme.colors.surface }} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <View style={{ width: "70%", height: 18, backgroundColor: theme.colors.surface, borderRadius: 4 }} />
                    <View style={{ width: "50%", height: 14, backgroundColor: theme.colors.surface, borderRadius: 4 }} />
                  </View>
                </View>
                {/* Stats bar skeleton */}
                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
                  <View style={{ height: 36, backgroundColor: theme.colors.surface, borderRadius: 10 }} />
                </View>
              </View>
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

  const renderListItem = ({ item }: { item: ListItem }) => {
    if (item.type === "header") {
      return (
        <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
          <View style={styles.headerTop}>
            <AppText variant="title" style={styles.headerTitle}>
              {t("groups.title")}
            </AppText>
            <Pressable
              onPress={handleOpenInfo}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={({ pressed }) => [
                styles.infoButton,
                pressed && { opacity: 0.5 },
              ]}
            >
              <Ionicons
                name="information-circle-outline"
                size={22}
                color={theme.colors.textSecondary}
              />
            </Pressable>
          </View>
          <View style={styles.headerLinks}>
            <Pressable
              onPress={handleBrowsePublic}
              style={({ pressed }) => [
                styles.headerLink,
                pressed && styles.headerLinkPressed,
              ]}
            >
              <Ionicons
                name="globe-outline"
                size={14}
                color={theme.colors.primary}
              />
              <AppText style={[styles.headerLinkText, { color: theme.colors.primary }]}>
                {t("groups.browsePublic")}
              </AppText>
            </Pressable>
            <AppText style={[styles.headerLinkDot, { color: theme.colors.textSecondary }]}>
              •
            </AppText>
            <Pressable
              onPress={handleJoinWithCode}
              style={({ pressed }) => [
                styles.headerLink,
                pressed && styles.headerLinkPressed,
              ]}
            >
              <Ionicons
                name="enter-outline"
                size={14}
                color={theme.colors.primary}
              />
              <AppText style={[styles.headerLinkText, { color: theme.colors.primary }]}>
                {t("groups.joinWithCode")}
              </AppText>
            </Pressable>
          </View>
        </View>
      );
    }

    if (item.type === "tabs") {
      return (
        <View style={{ backgroundColor: theme.colors.background }}>
          <GroupFilterTabs
            selectedFilter={selectedFilter}
            onFilterChange={setSelectedFilter}
            counts={counts}
          />
        </View>
      );
    }

    // Group card
    return (
      <GroupCard
        group={item.data}
        onPress={() => handleGroupPress(item.data.id)}
        unreadCount={unreadCounts[String(item.data.id)] ?? 0}
      />
    );
  };

  const getItemKey = (item: ListItem, index: number) => {
    if (item.type === "header") return "header";
    if (item.type === "tabs") return "tabs";
    return String(item.data.id);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Screen
        scroll={false}
        contentContainerStyle={{ alignItems: "stretch", flex: 1, padding: 0 }}
      >
        <FlatList
          style={styles.list}
          data={listData}
          keyExtractor={getItemKey}
          renderItem={renderListItem}
          stickyHeaderIndices={[1]}
          ListFooterComponent={
            filteredGroups.length === 0 ? (
              <View style={styles.emptyFilter}>
                <Ionicons
                  name="folder-open-outline"
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
          contentContainerStyle={{
            paddingBottom: totalTabBarSpace + theme.spacing.md,
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
      <GroupsInfoSheet sheetRef={infoSheetRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontWeight: "800",
    fontSize: 24,
  },
  infoButton: {
    padding: 4,
  },
  headerLinks: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },
  headerLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },
  headerLinkPressed: {
    opacity: 0.6,
  },
  headerLinkText: {
    fontSize: 13,
    fontWeight: "600",
  },
  headerLinkDot: {
    fontSize: 10,
    opacity: 0.5,
  },
  list: {
    flex: 1,
  },
  emptyFilter: {
    paddingVertical: 48,
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
});
