// app/(tabs)/groups.tsx
// Groups tab - main screen
// - Shows list of user's groups with filter tabs: All, Attention, Active, Drafts, Ended.
// - Empty state when no groups exist.
// - Navigates to group details on press.

import React, { useState, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
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
        <View
          style={[
            styles.header,
            { paddingHorizontal: theme.spacing.md },
          ]}
        >
          <AppText variant="title" style={styles.headerTitle}>
            {t("groups.title")}
          </AppText>
          <Pressable
            onPress={handleOpenInfo}
            style={({ pressed }) => [
              styles.infoButton,
              { opacity: pressed ? 0.5 : 1 },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={26}
              color={theme.colors.textSecondary}
            />
          </Pressable>
        </View>
        <GroupFilterTabs
          selectedFilter={selectedFilter}
          onFilterChange={setSelectedFilter}
          counts={counts}
          onPublicPress={handleBrowsePublic}
          onJoinPress={handleJoinWithCode}
        />
        <FlatList
          style={styles.list}
          data={filteredGroups}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyFilter}>
              <AppText variant="body" color="secondary">
                {t("groups.noGroupsInFilter")}
              </AppText>
            </View>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128, 128, 128, 0.3)",
  },
  headerTitle: {
    fontWeight: "700",
  },
  infoButton: {
    padding: 4,
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
});
