// features/invites/screens/InvitesInboxScreen.tsx
// List pending invites with Accept/Decline + group preview bottom sheet.

import React, { useCallback, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ListRenderItem,
  Platform,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import {
  useMyInvitesQuery,
  useRespondToInviteMutation,
} from "@/domains/invites";
import { InviteCard } from "../components/InviteCard";
import { Screen, AppText, Button } from "@/components/ui";
import { InfoSheet } from "@/components/ui/InfoSheet";
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

  // Preview sheet state
  const sheetRef = useRef<BottomSheetModal>(null);
  const [selectedInvite, setSelectedInvite] = useState<ApiInviteItem | null>(
    null
  );

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

  const handlePreview = useCallback((invite: ApiInviteItem) => {
    setSelectedInvite(invite);
    sheetRef.current?.present();
  }, []);

  const handleSheetAccept = useCallback(() => {
    if (!selectedInvite) return;
    sheetRef.current?.dismiss();
    handleAccept(selectedInvite.id);
  }, [selectedInvite, handleAccept]);

  const handleSheetDecline = useCallback(() => {
    if (!selectedInvite) return;
    sheetRef.current?.dismiss();
    handleDecline(selectedInvite.id);
  }, [selectedInvite, handleDecline]);

  const invites = data?.data?.invites ?? [];
  const pendingCount = data?.data?.pendingCount ?? 0;

  const renderItem: ListRenderItem<ApiInviteItem> = useCallback(
    ({ item }) => (
      <InviteCard
        invite={item}
        onAccept={() => handleAccept(item.id)}
        onDecline={() => handleDecline(item.id)}
        onPreview={() => handlePreview(item)}
        isResponding={respondMutation.isPending}
      />
    ),
    [handleAccept, handleDecline, handlePreview, respondMutation.isPending]
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

  const preview = selectedInvite?.groupPreview;

  return (
    <>
      <FlatList
        data={invites}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        removeClippedSubviews={Platform.OS === "android"}
        maxToRenderPerBatch={10}
        initialNumToRender={10}
        windowSize={5}
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

      {/* Group preview bottom sheet */}
      <InfoSheet sheetRef={sheetRef} enableDynamicSizing>
        {selectedInvite && preview ? (
          <View style={styles.sheetContent}>
            {/* Sheet header */}
            <AppText variant="title" style={styles.sheetTitle}>
              {selectedInvite.groupName}
            </AppText>
            {preview.description ? (
              <AppText
                variant="body"
                color="secondary"
                style={styles.sheetDescription}
                numberOfLines={3}
              >
                {preview.description}
              </AppText>
            ) : null}

            {/* Stats list */}
            <View
              style={[
                styles.sheetStats,
                { backgroundColor: theme.colors.cardBackground },
              ]}
            >
              <SheetStatRow
                icon="people-outline"
                label={t("groupInfo.members")}
                value={t("invites.membersOfMax", {
                  count: preview.memberCount,
                  max: preview.maxMembers,
                })}
                theme={theme}
              />
              <View
                style={[
                  styles.sheetStatDivider,
                  { backgroundColor: theme.colors.border },
                ]}
              />
              <SheetStatRow
                icon="football-outline"
                label={t("lobby.games")}
                value={t("invites.gamesCount", {
                  count: preview.totalFixtures,
                })}
                theme={theme}
              />
              <View
                style={[
                  styles.sheetStatDivider,
                  { backgroundColor: theme.colors.border },
                ]}
              />
              <SheetStatRow
                icon="game-controller-outline"
                label={t("lobby.predictionMode")}
                value={
                  preview.predictionMode === "MatchWinner"
                    ? t("lobby.matchWinner")
                    : t("lobby.exactResult")
                }
                theme={theme}
              />
              <View
                style={[
                  styles.sheetStatDivider,
                  { backgroundColor: theme.colors.border },
                ]}
              />
              <SheetStatRow
                icon={
                  preview.privacy === "private"
                    ? "lock-closed-outline"
                    : "globe-outline"
                }
                label={t("lobby.privacy")}
                value={
                  preview.privacy === "private"
                    ? t("lobby.private")
                    : t("lobby.publicDescription")
                }
                theme={theme}
              />
            </View>

            {/* Sheet actions */}
            <View style={styles.sheetActions}>
              <Button
                label={t("invites.accept")}
                onPress={handleSheetAccept}
                disabled={respondMutation.isPending}
                style={styles.acceptBtn}
                icon="checkmark"
              />
              <Button
                label={t("invites.decline")}
                variant="secondary"
                onPress={handleSheetDecline}
                disabled={respondMutation.isPending}
                style={styles.declineBtn}
              />
            </View>
          </View>
        ) : null}
      </InfoSheet>
    </>
  );
}

function SheetStatRow({
  icon,
  label,
  value,
  theme,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  return (
    <View style={styles.sheetStatRow}>
      <Ionicons name={icon} size={18} color={theme.colors.textSecondary} />
      <AppText variant="body" color="secondary" style={styles.sheetStatLabel}>
        {label}
      </AppText>
      <AppText variant="body" style={styles.sheetStatValue}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingBottom: 32,
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
  // Sheet styles
  sheetContent: {
    gap: 12,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  sheetDescription: {
    textAlign: "center",
    lineHeight: 20,
  },
  sheetStats: {
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
  },
  sheetStatRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 10,
  },
  sheetStatLabel: {
    flex: 1,
  },
  sheetStatValue: {
    fontWeight: "600",
  },
  sheetStatDivider: {
    height: StyleSheet.hairlineWidth,
  },
  sheetActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  acceptBtn: {
    flex: 1,
  },
  declineBtn: {
    flex: 1,
  },
});
