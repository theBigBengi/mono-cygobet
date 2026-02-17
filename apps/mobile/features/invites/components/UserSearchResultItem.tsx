// features/invites/components/UserSearchResultItem.tsx
// Single row: avatar, username, isInSharedGroup, Invite button.

import React from "react";
import { View, StyleSheet, Image, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { ApiUserSearchItem } from "@repo/types";

interface UserSearchResultItemProps {
  user: ApiUserSearchItem;
  onInvite: () => void;
  isSending?: boolean;
}

function getInitials(username: string): string {
  if (!username?.trim()) return "?";
  return username.slice(0, 2).toUpperCase();
}

export function UserSearchResultItem({
  user,
  onInvite,
  isSending,
}: UserSearchResultItemProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

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
        {user.image ? (
          <Image
            source={{ uri: user.image }}
            style={styles.avatarImage}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Text style={[styles.initials, { color: theme.colors.primary }]}>
            {getInitials(user.username)}
          </Text>
        )}
      </View>

      {/* User info */}
      <View style={styles.content}>
        {user.name ? (
          <Text style={[styles.displayName, { color: theme.colors.textPrimary }]}>
            {user.name}
          </Text>
        ) : null}
        <Text style={[styles.username, { color: user.name ? theme.colors.textSecondary : theme.colors.textPrimary }]}>
          @{user.username}
        </Text>
        {user.isInSharedGroup && (
          <View style={styles.sharedGroupRow}>
            <Ionicons
              name="people-outline"
              size={12}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.sharedGroupText, { color: theme.colors.textSecondary }]}>
              {t("invites.inSharedGroup")}
            </Text>
          </View>
        )}
      </View>

      {/* Invite button */}
      <Button
        label={t("invites.inviteButton")}
        variant="primary"
        onPress={onInvite}
        disabled={isSending}
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
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    overflow: "hidden",
  },
  avatarImage: {
    width: 48,
    height: 48,
  },
  initials: {
    fontSize: 17,
    fontWeight: "700",
  },
  content: {
    flexGrow: 1,
    flexShrink: 1,
    marginRight: 12,
  },
  displayName: {
    fontSize: 16,
    fontWeight: "600",
  },
  username: {
    fontSize: 15,
    fontWeight: "600",
  },
  sharedGroupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  sharedGroupText: {
    fontSize: 12,
  },
  button: {
    minWidth: 90,
  },
});
