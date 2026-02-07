// app/(tabs)/groups.tsx
// Groups tab - main screen
// - Shows list of user's groups in sections: attention, active, drafts, ended.
// - Empty state when no groups exist.
// - Navigates to group details on press.

import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  SectionList,
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
import { GroupCard } from "@/features/groups/group-list/components/GroupCard";
import {
  useGroupSections,
  type GroupSection,
} from "@/features/groups/group-list/hooks";
import type { ApiGroupItem } from "@repo/types";
import { Ionicons } from "@expo/vector-icons";

export default function GroupsScreen() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, isLoading, error, refetch } = useMyGroupsQuery();
  const { data: unreadData, refetch: refetchUnread } = useUnreadCountsQuery();
  const unreadCounts = unreadData?.data ?? {};
  const [endedCollapsed, setEndedCollapsed] = useState(true);
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
  const { sections } = useGroupSections(groups);

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

  const displaySections: (GroupSection & { originalCount?: number })[] =
    sections.map((s) => {
      if (s.key === "ended" && endedCollapsed) {
        return { ...s, data: [], originalCount: s.data.length };
      }
      return s;
    });

  const tabBarHeight = 60 + insets.bottom;
  const tabBarMarginBottom = theme.spacing.sm;
  const totalTabBarSpace = tabBarHeight + tabBarMarginBottom;

  const renderHeader = () => (
    <View style={[styles.actionRow, { paddingBottom: theme.spacing.md }]}>
      <Pressable
        onPress={handleJoinWithCode}
        style={[styles.iconButton, { backgroundColor: theme.colors.surface }]}
      >
        <Ionicons name="link-outline" size={20} color={theme.colors.primary} />
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
  );

  const renderSectionHeader = ({
    section,
  }: {
    section: GroupSection & { originalCount?: number };
  }) => {
    const count =
      section.key === "ended" && section.originalCount !== undefined
        ? section.originalCount
        : section.data.length;
    const titleText = `${section.title} (${count})`;
    const isEnded = section.key === "ended";
    const isAttention = section.key === "attention";

    const headerContent = (
      <View
        style={[styles.sectionDivider, { marginVertical: theme.spacing.sm }]}
      >
        <View
          style={[styles.dividerLine, { backgroundColor: theme.colors.border }]}
        />
        <View style={styles.dividerCenter}>
          <AppText
            variant="caption"
            color="secondary"
            style={[
              styles.dividerText,
              isAttention && { color: theme.colors.primary, fontWeight: "600" },
            ]}
          >
            {titleText}
          </AppText>
          {isEnded && (
            <Ionicons
              name={endedCollapsed ? "chevron-forward" : "chevron-down"}
              size={16}
              color={theme.colors.textSecondary}
              style={styles.chevron}
            />
          )}
        </View>
        <View
          style={[styles.dividerLine, { backgroundColor: theme.colors.border }]}
        />
      </View>
    );

    if (isEnded) {
      return (
        <Pressable
          onPress={() => setEndedCollapsed((c) => !c)}
          style={styles.sectionHeaderPressable}
        >
          {headerContent}
        </Pressable>
      );
    }

    return headerContent;
  };

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
        <SectionList<ApiGroupItem, GroupSection & { originalCount?: number }>
          style={styles.sectionList}
          sections={displaySections}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          ListHeaderComponent={renderHeader}
          stickySectionHeadersEnabled={false}
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
  sectionList: {
    flex: 1,
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
  sectionDivider: {
    flexDirection: "row",
    alignItems: "center",
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerCenter: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  dividerText: {
    fontWeight: "600",
  },
  sectionHeaderPressable: {
    width: "100%",
  },
  chevron: {
    marginStart: 4,
  },
});
