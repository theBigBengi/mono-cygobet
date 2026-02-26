// features/invites/components/SentInvitesList.tsx
// List of sent invites with cancel functionality.

import React from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useSentInvitesQuery, useCancelInviteMutation } from "@/domains/invites";
import { SentInviteItem } from "./SentInviteItem";

interface SentInvitesListProps {
  groupId: number;
}

export function SentInvitesList({ groupId }: SentInvitesListProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const { data, isLoading } = useSentInvitesQuery(groupId);
  const cancelMutation = useCancelInviteMutation(groupId);

  const invites = data?.data ?? [];

  const handleCancel = (inviteId: number) => {
    cancelMutation.mutate(inviteId, {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
      onError: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      },
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  if (invites.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <AppText variant="caption" color="secondary" style={styles.headerTitle}>
        {t("invites.sentInvites")} ({invites.length})
      </AppText>
      {invites.map((item) => (
        <SentInviteItem
          key={String(item.id)}
          invite={item}
          onCancel={handleCancel}
          isCancelling={cancelMutation.isPending}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
  },
  headerTitle: {
    marginBottom: 12,
  },
});
