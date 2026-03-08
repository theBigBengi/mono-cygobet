// features/groups/activity/screens/GroupActivityScreen.tsx
// Paginated activity feed for a group.

import React, { useCallback, useEffect, useMemo } from "react";
import { View, FlatList, StyleSheet, RefreshControl } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useGroupActivityQuery, useMarkActivityAsRead } from "@/domains/groups";
import { ActivityEventCard } from "../components/ActivityEventCard";
import type { ApiGroupActivityItem } from "@repo/types";

interface GroupActivityScreenProps {
  groupId: number | null;
}

export function GroupActivityScreen({ groupId }: GroupActivityScreenProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useGroupActivityQuery(groupId);

  const markAsRead = useMarkActivityAsRead(groupId);

  const items = useMemo(
    () => data?.pages.flatMap((p) => p.data.items) ?? [],
    [data]
  );

  // Mark as read whenever the latest item changes (new activity arrives or first load)
  const latestItemId = items.length > 0 ? items[0].id : null;
  useEffect(() => {
    if (latestItemId != null) {
      markAsRead(latestItemId);
    }
  }, [latestItemId, markAsRead]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: ApiGroupActivityItem }) => (
      <ActivityEventCard item={item} />
    ),
    []
  );

  if (groupId == null) {
    return (
      <View style={styles.empty}>
        <AppText variant="body" color="secondary">
          {t("groups.loadingGroup")}
        </AppText>
      </View>
    );
  }

  if (!isLoading && items.length === 0) {
    return (
      <View style={styles.empty}>
        <AppText variant="subtitle" color="secondary">
          {t("activity.empty")}
        </AppText>
        <AppText variant="body" color="secondary" style={styles.emptySubtitle}>
          {t("activity.emptySubtitle")}
        </AppText>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.3}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching && !isFetchingNextPage}
          onRefresh={refetch}
          tintColor={theme.colors.textSecondary}
        />
      }
      contentContainerStyle={[
        styles.list,
        items.length === 0 && styles.emptyList,
      ]}
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={styles.footer}>
            <AppText variant="caption" color="secondary">
              {t("activity.loading")}
            </AppText>
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flexGrow: 1,
  },
  emptyList: {
    justifyContent: "center",
    alignItems: "center",
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 8,
  },
  emptySubtitle: {
    textAlign: "center",
  },
  footer: {
    paddingVertical: 16,
    alignItems: "center",
  },
});
