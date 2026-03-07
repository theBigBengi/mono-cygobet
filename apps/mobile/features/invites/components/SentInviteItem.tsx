// features/invites/components/SentInviteItem.tsx
// Compact row showing a sent invite with cancel option.

import React from "react";
import { View, StyleSheet, Image, Text, Alert, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme";
import { getInitials } from "@/utils/string";
import type { SentInviteItem as SentInviteItemType } from "@/domains/invites";

interface SentInviteItemProps {
  invite: SentInviteItemType;
  onCancel: (inviteId: number) => void;
  isCancelling?: boolean;
}

function getExpiresText(expiresAt: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diffMs = expires.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return t("invites.expired");
  if (diffDays === 1) return t("invites.expiresInOne");
  return t("invites.expiresIn", { days: diffDays });
}

export function SentInviteItem({
  invite,
  onCancel,
  isCancelling,
}: SentInviteItemProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  const handleCancel = () => {
    Alert.alert(
      t("invites.cancelInvite"),
      t("invites.cancelInviteConfirm", { username: invite.inviteeUsername ?? "?" }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("invites.cancelInvite"),
          style: "destructive",
          onPress: () => onCancel(invite.id),
        },
      ]
    );
  };

  return (
    <View style={styles.row}>
      {/* Avatar */}
      <View
        style={[
          styles.avatar,
          { backgroundColor: theme.colors.textPrimary + "10" },
        ]}
      >
        {invite.inviteeImage ? (
          <Image
            source={{ uri: invite.inviteeImage }}
            style={styles.avatarImage}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Text style={[styles.initials, { color: theme.colors.textPrimary }]}>
            {getInitials(invite.inviteeUsername)}
          </Text>
        )}
      </View>

      {/* User info */}
      <View style={styles.content}>
        <Text style={[styles.username, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          @{invite.inviteeUsername ?? "?"}
        </Text>
        <View style={styles.expiresRow}>
          <Ionicons name="time-outline" size={10} color={theme.colors.textSecondary} />
          <Text style={[styles.expiresText, { color: theme.colors.textSecondary }]}>
            {getExpiresText(invite.expiresAt, t)}
          </Text>
        </View>
      </View>

      {/* Cancel button */}
      <Pressable
        onPress={handleCancel}
        disabled={isCancelling}
        style={({ pressed }) => [
          styles.cancelBtn,
          { borderColor: theme.colors.textSecondary + "30" },
          pressed && { opacity: 0.6 },
          isCancelling && { opacity: 0.4 },
        ]}
      >
        <Text style={[styles.cancelText, { color: theme.colors.textSecondary }]}>
          {t("invites.cancelInvite")}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 36,
    height: 36,
  },
  initials: {
    fontSize: 13,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    gap: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: "600",
  },
  expiresRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  expiresText: {
    fontSize: 11,
    fontWeight: "500",
  },
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
