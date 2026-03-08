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
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { Screen, AppText, Button, TAB_BAR_HEIGHT } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useQueryClient } from "@tanstack/react-query";
import { useMyGroupsQuery, useUnreadCountsQuery, useUnreadActivityCountsQuery, groupsKeys, fetchGroupById } from "@/domains/groups";
import { useMyInvitesQuery } from "@/domains/invites";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import {
  GroupCard,
  GroupCardRow,
  GroupSortRow,
  FilterSortSheet,
  GroupsInfoSheet,
} from "@/features/groups/group-list/components";
import type { GroupViewMode } from "@/features/groups/group-list/components/GroupSortRow";
import { useGroupFilter } from "@/features/groups/group-list/hooks";
import type { ApiGroupItem } from "@repo/types";
import { PredictAllBanner } from "@/features/groups/predictions/components/PredictAllBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GroupsListSkeleton } from "@/features/groups/group-list/components/GroupsListSkeleton";
import { CreateGroupFlow } from "@/features/group-creation/components";

/* ─── Groups Screen ─── */

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
  const { data: unreadData, refetch: refetchUnread, isLoading: isUnreadLoading } = useUnreadCountsQuery();
  const unreadCounts = unreadData?.data ?? {};
  const { data: unreadActivityData, isLoading: isActivityLoading } = useUnreadActivityCountsQuery();
  const unreadActivityCounts = unreadActivityData?.data ?? {};
  const isHudLoading = isUnreadLoading || isActivityLoading;
  const { data: invitesData } = useMyInvitesQuery({ status: "pending" });
  const pendingInviteCount = invitesData?.data?.invites?.length ?? 0;
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<GroupViewMode>("card");

  const isTabsStickyRef = useRef(false);
  const headerHeightRef = useRef(0);
  const infoSheetRef = useRef<BottomSheetModal>(null);
  const createSheetRef = useRef<BottomSheetModal>(null);
  const filterSortSheetRef = useRef<BottomSheetModal>(null);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const sticky =
        headerHeightRef.current > 0 &&
        e.nativeEvent.contentOffset.y >= headerHeightRef.current;
      if (sticky !== isTabsStickyRef.current) {
        isTabsStickyRef.current = sticky;
      }
    },
    [],
  );

  const handleOpenInfo = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    infoSheetRef.current?.present();
  }, []);

  const handleOpenCreate = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createSheetRef.current?.present();
  }, []);

  const handleOpenFilterSort = useCallback(() => {
    filterSortSheetRef.current?.present();
  }, []);

  const handleToggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === "card" ? "row" : "card"));
  }, []);

  const handleOpenInvites = useCallback(() => {
    router.push("/invites");
  }, [router]);

  const handleOpenSearch = useCallback(() => {
    router.push("/groups/search");
  }, [router]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), refetchUnread()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetch, refetchUnread]);

  const handleCreateGroup = () => {
    handleOpenCreate();
  };

  const handleJoinWithCode = useCallback(() => {
    router.push("/groups/join");
  }, [router]);

  const handleBrowsePublic = useCallback(() => {
    router.push("/groups/discover");
  }, [router]);

  const handleGroupPress = useCallback((groupId: number) => {
    router.push({ pathname: '/groups/[id]', params: { id: String(groupId) } });
  }, [router]);

  const groups = data?.data || [];
  const { selectedFilter, setSelectedFilter, selectedSort, setSelectedSort, filteredGroups, counts } =
    useGroupFilter(groups);

  // Build list data: header, tabs, sortRow, then groups
  type ListItem =
    | { type: "header" }
    | { type: "sortRow" }
    | { type: "banner" }
    | { type: "group"; data: ApiGroupItem };

  const hasUnpredicted = groups.some(
    (g) => g.status === "active" && (g.unpredictedGamesCount ?? 0) > 0
  );

  // Prefetch first predictable group's fixtures for instant Predict All load
  const queryClient = useQueryClient();
  React.useEffect(() => {
    if (!hasUnpredicted) return;
    const first = groups.find(
      (g) => g.status === "active" && (g.unpredictedGamesCount ?? 0) > 0
    );
    if (first) {
      queryClient.prefetchQuery({
        queryKey: groupsKeys.detail(first.id, true),
        queryFn: () => fetchGroupById(first.id, { include: "fixtures" }),
        meta: { scope: "user" },
      });
    }
  }, [hasUnpredicted, groups, queryClient]);

  const listData = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [
      { type: "header" },
    ];
    if (hasUnpredicted) {
      items.push({ type: "banner" });
    }
    items.push({ type: "sortRow" });
    filteredGroups.forEach((g) => items.push({ type: "group", data: g }));
    return items;
  }, [filteredGroups, hasUnpredicted]);

  const renderListItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.type === "header") {
      return (
        <View
          style={[styles.header, { backgroundColor: theme.colors.background }]}
          onLayout={(e) => { headerHeightRef.current = e.nativeEvent.layout.height; }}
        >
          {/* Row 1: Title + Invites badge + Info */}
          <View style={styles.headerTop}>
            <AppText variant="title" style={styles.headerTitle}>
              {t("groups.title")}
            </AppText>
            <View style={styles.headerActions}>
              <Pressable
                onPress={handleOpenSearch}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={({ pressed }) => [
                  styles.infoButton,
                  pressed && { opacity: 0.5 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Search groups"
              >
                <Ionicons
                  name="search-outline"
                  size={26}
                  color={theme.colors.textPrimary}
                />
              </Pressable>
              <Pressable
                onPress={handleOpenInvites}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={({ pressed }) => [
                  styles.infoButton,
                  pressed && { opacity: 0.5 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Invitations"
              >
                <Ionicons
                  name={pendingInviteCount > 0 ? "mail" : "mail-outline"}
                  size={26}
                  color={theme.colors.textPrimary}
                />
                {pendingInviteCount > 0 && (
                  <View style={[styles.inviteBadge, { backgroundColor: theme.colors.danger }]}>
                    <AppText style={[styles.inviteBadgeText, { color: theme.colors.textInverse }]}>
                      {pendingInviteCount > 9 ? "9+" : String(pendingInviteCount)}
                    </AppText>
                  </View>
                )}
              </Pressable>
              <Pressable
                onPress={handleOpenCreate}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={({ pressed }) => [
                  styles.infoButton,
                  pressed && { opacity: 0.5 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Create group"
              >
                <Ionicons
                  name="add-outline"
                  size={30}
                  color={theme.colors.textPrimary}
                />
              </Pressable>
            </View>
          </View>
        </View>
      );
    }

    if (item.type === "sortRow") {
      return (
        <GroupSortRow
          selectedFilter={selectedFilter}
          selectedSort={selectedSort}
          viewMode={viewMode}
          onFilterSortPress={handleOpenFilterSort}
          onViewModeToggle={handleToggleViewMode}
        />
      );
    }

    if (item.type === "banner") {
      return <PredictAllBanner />;
    }

    // Group card or compact row
    if (viewMode === "row") {
      return (
        <GroupCardRow
          group={item.data}
          onPress={handleGroupPress}
        />
      );
    }

    return (
      <GroupCard
        group={item.data}
        onPress={handleGroupPress}
        unreadCount={unreadCounts[String(item.data.id)] ?? 0}
        unreadActivityCount={unreadActivityCounts[String(item.data.id)] ?? 0}
        isHudLoading={isHudLoading}
      />
    );
  }, [theme, handleOpenCreate, handleOpenInfo, handleOpenInvites, handleOpenSearch, handleOpenFilterSort, handleToggleViewMode, viewMode, pendingInviteCount, selectedFilter, selectedSort, handleGroupPress, unreadCounts, unreadActivityCounts, isHudLoading]);

  // Loading state — skeleton
  if (isLoading) {
    return <GroupsListSkeleton />;
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

  // Empty state — user has no groups
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

  const tabBarHeight = TAB_BAR_HEIGHT + insets.bottom;
  const tabBarMarginBottom = theme.spacing.sm;
  const totalTabBarSpace = tabBarHeight + tabBarMarginBottom;

  const getItemKey = (item: ListItem, index: number) => {
    if (item.type === "header") return "header";
    if (item.type === "sortRow") return "sortRow";
    if (item.type === "banner") return "predictAllBanner";
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
          stickyHeaderIndices={[0]}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          windowSize={5}
          maxToRenderPerBatch={5}
          initialNumToRender={7}
          removeClippedSubviews={Platform.OS === "android"}
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

      <CreateGroupFlow
        sheetRef={createSheetRef}
        groupCount={groups.length}
      />

      <FilterSortSheet
        sheetRef={filterSortSheetRef}
        selectedFilter={selectedFilter}
        selectedSort={selectedSort}
        onFilterChange={setSelectedFilter}
        onSortChange={setSelectedSort}
        counts={counts}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingTop: 12,
    paddingBottom: 0,
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  infoButton: {
    padding: 4,
  },
  inviteBadge: {
    position: "absolute",
    top: -2,
    right: -4,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  inviteBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 14,
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
