// features/invites/components/SentInviteItem.tsx
// Single row showing a sent invite with cancel button.

import React from "react";
import { View, StyleSheet, Image, Text, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { SentInviteItem as SentInviteItemType } from "@/domains/invites";

interface SentInviteItemProps {
  invite: SentInviteItemType;
  onCancel: (inviteId: number) => void;
  isCancelling?: boolean;
}

function getInitials(username: string | null): string {
  if (!username?.trim()) return "?";
  return username.slice(0, 2).toUpperCase();
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
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.cardBackground,
          borderColor: theme.colors.border,
        },
      ]}
    >
      {/* Avatar */}
      <View
        style={[
          styles.avatarWrap,
          { backgroundColor: theme.colors.primary + "15" },
        ]}
      >
        {invite.inviteeImage ? (
          <Image
            source={{ uri: invite.inviteeImage }}
            style={styles.avatarImage}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Text style={[styles.initials, { color: theme.colors.primary }]}>
            {getInitials(invite.inviteeUsername)}
          </Text>
        )}
      </View>

      {/* User info */}
      <View style={styles.content}>
        <Text style={[styles.username, { color: theme.colors.textPrimary }]}>
          @{invite.inviteeUsername ?? "?"}
        </Text>
        <View style={styles.expiresRow}>
          <Ionicons
            name="time-outline"
            size={12}
            color={theme.colors.textSecondary}
          />
          <Text style={[styles.expiresText, { color: theme.colors.textSecondary }]}>
            {getExpiresText(invite.expiresAt, t)}
          </Text>
        </View>
      </View>

      {/* Cancel button */}
      <Button
        label={t("invites.cancelInvite")}
        variant="secondary"
        onPress={handleCancel}
        disabled={isCancelling}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  avatarImage: {
    width: 44,
    height: 44,
  },
  initials: {
    fontSize: 15,
    fontWeight: "700",
  },
  content: {
    flexGrow: 1,
    flexShrink: 1,
    marginRight: 12,
  },
  username: {
    fontSize: 15,
    fontWeight: "600",
  },
  expiresRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  expiresText: {
    fontSize: 12,
  },
  button: {
    minWidth: 80,
  },
});
