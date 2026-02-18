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
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
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
            <View style={styles.headerTop}>
              <View style={{ width: 100, height: 28, backgroundColor: theme.colors.surface, borderRadius: 8 }} />
              <View style={{ width: 28, height: 28, backgroundColor: theme.colors.surface, borderRadius: 14 }} />
            </View>
            <View style={styles.headerChips}>
              <View
                style={{
                  width: 100,
                  height: 36,
                  backgroundColor: theme.colors.surface,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderBottomWidth: 3,
                  borderColor: theme.colors.border,
                }}
              />
              <View
                style={{
                  width: 95,
                  height: 36,
                  backgroundColor: theme.colors.surface,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderBottomWidth: 3,
                  borderColor: theme.colors.border,
                }}
              />
            </View>
          </View>

          {/* Filter tabs skeleton */}
          <View style={{
            flexDirection: "row",
            paddingHorizontal: 16,
            paddingVertical: 10,
            gap: 8,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
            backgroundColor: theme.colors.background,
          }}>
            {[70, 85, 60, 55, 60].map((w, i) => (
              <View
                key={i}
                style={{
                  width: w,
                  height: 32,
                  backgroundColor: i === 0 ? theme.colors.primary + "20" : theme.colors.surface,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: i === 0 ? theme.colors.primary + "40" : theme.colors.border,
                }}
              />
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
                  borderRadius: 14,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <View
                  style={{
                    backgroundColor: theme.colors.cardBackground,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    paddingTop: 14,
                    paddingHorizontal: 14,
                    overflow: "hidden",
                  }}
                >
                  {/* Top row skeleton */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                    {/* Avatar */}
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 12,
                        backgroundColor: theme.colors.surface,
                      }}
                    />
                    {/* Info */}
                    <View style={{ flex: 1, gap: 8 }}>
                      <View style={{ width: "75%", height: 18, backgroundColor: theme.colors.surface, borderRadius: 6 }} />
                      <View
                        style={{
                          width: 100,
                          height: 24,
                          backgroundColor: theme.colors.surface,
                          borderRadius: 8,
                        }}
                      />
                    </View>
                    {/* Right badges */}
                    <View style={{ gap: 6, alignItems: "center" }}>
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.surface }} />
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.surface }} />
                    </View>
                  </View>

                  {/* Next game skeleton */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: 14,
                      marginHorizontal: -14,
                      paddingHorizontal: 14,
                      paddingTop: 14,
                      paddingBottom: 12,
                      borderTopWidth: 1,
                      borderTopColor: theme.colors.border,
                    }}
                  >
                    <View style={{ flex: 1, gap: 6 }}>
                      <View style={{ width: 100, height: 12, backgroundColor: theme.colors.surface, borderRadius: 4 }} />
                      <View style={{ width: 150, height: 16, backgroundColor: theme.colors.surface, borderRadius: 4 }} />
                    </View>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      <View style={{ alignItems: "center", gap: 2 }}>
                        <View style={{ width: 20, height: 10, backgroundColor: theme.colors.surface, borderRadius: 3 }} />
                        <View
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 7,
                            backgroundColor: theme.colors.surface,
                            borderWidth: 1,
                            borderBottomWidth: 3,
                            borderColor: theme.colors.border,
                          }}
                        />
                      </View>
                      <View style={{ alignItems: "center", gap: 2 }}>
                        <View style={{ width: 20, height: 10, backgroundColor: theme.colors.surface, borderRadius: 3 }} />
                        <View
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 7,
                            backgroundColor: theme.colors.surface,
                            borderWidth: 1,
                            borderBottomWidth: 3,
                            borderColor: theme.colors.border,
                          }}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Stats HUD skeleton */}
                  <View
                    style={{
                      flexDirection: "row",
                      paddingVertical: 12,
                      gap: 4,
                      borderTopWidth: 1,
                      borderTopColor: theme.colors.border,
                    }}
                  >
                    {[1, 2, 3, 4].map((j) => (
                      <View
                        key={j}
                        style={{
                          flex: 1,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                          paddingVertical: 6,
                        }}
                      >
                        <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: theme.colors.surface }} />
                        <View style={{ width: 28, height: 14, borderRadius: 4, backgroundColor: theme.colors.surface }} />
                      </View>
                    ))}
                  </View>
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
          <View style={styles.headerChips}>
            <Pressable
              onPress={handleBrowsePublic}
              style={({ pressed }) => [
                styles.headerChip,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderBottomColor: pressed
                    ? theme.colors.border
                    : theme.colors.textSecondary + "40",
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                },
              ]}
            >
              <Ionicons
                name="globe-outline"
                size={14}
                color={theme.colors.textSecondary}
              />
              <AppText style={[styles.headerChipText, { color: theme.colors.textPrimary }]}>
                {t("groups.browsePublic")}
              </AppText>
            </Pressable>
            <Pressable
              onPress={handleJoinWithCode}
              style={({ pressed }) => [
                styles.headerChip,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderBottomColor: pressed
                    ? theme.colors.border
                    : theme.colors.textSecondary + "40",
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                },
              ]}
            >
              <Ionicons
                name="key-outline"
                size={14}
                color={theme.colors.textSecondary}
              />
              <AppText style={[styles.headerChipText, { color: theme.colors.textPrimary }]}>
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
  headerChips: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 8,
  },
  headerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderBottomWidth: 3,
  },
  headerChipText: {
    fontSize: 13,
    fontWeight: "600",
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
