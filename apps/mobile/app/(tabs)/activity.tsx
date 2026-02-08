import React, { useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Platform,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useActivityFeedQuery } from "@/domains/activity";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import { ActivityCard } from "@/features/activity";
import type { ApiActivityFeedItem } from "@repo/types";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function ActivityTabScreen() {
  return (
    <ErrorBoundary feature="activity">
      <ActivityContent />
    </ErrorBoundary>
  );
}

function ActivityContent() {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useActivityFeedQuery();

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const items: ApiActivityFeedItem[] =
    data?.pages.flatMap((p) => p.data.items) ?? [];

  if (isLoading) {
    return (
      <View style={styles.root}>
        <QueryLoadingView message={t("activity.loading")} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.root}>
        <QueryErrorView
          message={t("activity.failedLoad")}
          onRetry={() => refetch()}
        />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <ActivityCard item={item} />}
        contentContainerStyle={[
          styles.listContent,
          items.length === 0 && styles.emptyList,
          { paddingBottom: insets.bottom + theme.spacing.lg },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={
              Platform.OS === "android" ? [theme.colors.primary] : undefined
            }
          />
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.empty}>
            <AppText variant="title" style={styles.emptyTitle}>
              {t("activity.empty")}
            </AppText>
            <AppText
              variant="body"
              color="secondary"
              style={styles.emptySubtitle}
            >
              {t("activity.emptySubtitle")}
            </AppText>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingVertical: 16,
  },
  emptyList: {
    flex: 1,
    justifyContent: "center",
  },
  empty: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  emptyTitle: {
    marginBottom: 12,
    textAlign: "center",
  },
  emptySubtitle: {
    textAlign: "center",
  },
});
