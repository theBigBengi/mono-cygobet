// features/invites/screens/InvitesInboxScreen.tsx
// List pending invites with Accept/Decline.

import React, { useCallback, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ListRenderItem,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  useMyInvitesQuery,
  useRespondToInviteMutation,
} from "@/domains/invites";
import { InviteCard } from "../components/InviteCard";
import { Screen, AppText } from "@/components/ui";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import { useTheme } from "@/lib/theme";
import type { ApiInviteItem } from "@repo/types";

export function InvitesInboxScreen() {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const { data, isLoading, error, refetch } = useMyInvitesQuery({
    status: "pending",
  });
  const respondMutation = useRespondToInviteMutation();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleAccept = useCallback(
    (inviteId: number) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      respondMutation.mutate({ inviteId, action: "accept" });
    },
    [respondMutation]
  );

  const handleDecline = useCallback(
    (inviteId: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      respondMutation.mutate({ inviteId, action: "decline" });
    },
    [respondMutation]
  );

  const invites = data?.data?.invites ?? [];
  const pendingCount = data?.data?.pendingCount ?? 0;

  const renderHeader = () => (
    <View style={styles.headerSection}>
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: theme.colors.primary + "15" },
        ]}
      >
        <Ionicons name="mail" size={32} color={theme.colors.primary} />
      </View>
      <AppText variant="title" style={styles.title}>
        {t("invites.invitations")}
      </AppText>
      <AppText variant="body" color="secondary" style={styles.subtitle}>
        {pendingCount > 0
          ? t("invites.pendingInvitesCount", { count: pendingCount })
          : t("invites.pendingInvitesDescription")}
      </AppText>
    </View>
  );

  const renderItem: ListRenderItem<ApiInviteItem> = useCallback(
    ({ item }) => (
      <InviteCard
        invite={item}
        onAccept={() => handleAccept(item.id)}
        onDecline={() => handleDecline(item.id)}
        isResponding={respondMutation.isPending}
      />
    ),
    [handleAccept, handleDecline, respondMutation.isPending]
  );

  const keyExtractor = useCallback(
    (item: ApiInviteItem) => String(item.id),
    []
  );

  if (isLoading) {
    return (
      <Screen>
        <QueryLoadingView message={t("invites.loadingInvites")} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <QueryErrorView
          message={t("invites.failedLoadInvites")}
          onRetry={() => refetch()}
        />
      </Screen>
    );
  }

  if (invites.length === 0) {
    return (
      <Screen>
        <View style={styles.emptyContainer}>
          {renderHeader()}
          <View style={styles.emptyContent}>
            <View
              style={[
                styles.emptyIconCircle,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Ionicons
                name="mail-open-outline"
                size={48}
                color={theme.colors.textSecondary}
                style={{ opacity: 0.5 }}
              />
            </View>
            <AppText
              variant="body"
              color="secondary"
              style={styles.emptyText}
            >
              {t("invites.noInvites")}
            </AppText>
            <AppText
              variant="caption"
              color="secondary"
              style={styles.emptySubtext}
            >
              {t("invites.noInvitesHint")}
            </AppText>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <FlatList
        data={invites}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={[
          styles.container,
          { paddingHorizontal: theme.spacing.lg },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  headerSection: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    paddingHorizontal: 20,
  },
  emptyContainer: {
    flex: 1,
    padding: 20,
  },
  emptyContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 80,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
