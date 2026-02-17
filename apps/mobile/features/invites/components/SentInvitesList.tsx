// features/invites/components/SentInvitesList.tsx
// List of sent invites with cancel functionality.

import React from "react";
import { View, StyleSheet, ActivityIndicator, FlatList } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
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
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="mail-outline"
          size={24}
          color={theme.colors.textSecondary}
          style={{ opacity: 0.5 }}
        />
        <AppText variant="body" color="secondary" style={styles.emptyText}>
          {t("invites.noSentInvites")}
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="send" size={16} color={theme.colors.textSecondary} />
        <AppText variant="label" color="secondary" style={styles.headerTitle}>
          {t("invites.sentInvites")}
        </AppText>
        <View
          style={[styles.countBadge, { backgroundColor: theme.colors.primary + "20" }]}
        >
          <AppText variant="caption" style={{ color: theme.colors.primary, fontWeight: "600" }}>
            {invites.length}
          </AppText>
        </View>
      </View>
      <FlatList
        data={invites}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <SentInviteItem
            invite={item}
            onCancel={handleCancel}
            isCancelling={cancelMutation.isPending}
          />
        )}
        scrollEnabled={false}
      />
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
});
