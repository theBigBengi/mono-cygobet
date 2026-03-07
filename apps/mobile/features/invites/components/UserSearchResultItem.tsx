// features/invites/components/UserSearchResultItem.tsx
// Compact row: avatar, username, isInSharedGroup, Invite button.

import React from "react";
import { View, StyleSheet, Image, Text, Pressable, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme";
import { getInitials } from "@/utils/string";
import type { ApiUserSearchItem } from "@repo/types";

interface UserSearchResultItemProps {
  user: ApiUserSearchItem;
  onInvite: () => void;
  onCancelInvite?: () => void;
  isSending?: boolean;
  isCancelling?: boolean;
  invited?: boolean;
}

export function UserSearchResultItem({
  user,
  onInvite,
  onCancelInvite,
  isSending,
  isCancelling,
  invited,
}: UserSearchResultItemProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  return (
    <View style={styles.row}>
      {/* Avatar */}
      <View style={styles.avatarWrapper}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: theme.colors.textPrimary + "10" },
          ]}
        >
          {user.image ? (
            <Image
              source={{ uri: user.image }}
              style={styles.avatarImage}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <Text style={[styles.initials, { color: theme.colors.textPrimary }]}>
              {getInitials(user.username)}
            </Text>
          )}
        </View>
        {invited && (
          <View style={[styles.checkBadge, { backgroundColor: theme.colors.success, borderColor: theme.colors.background }]}>
            <Ionicons name="checkmark" size={10} color="#fff" />
          </View>
        )}
      </View>

      {/* User info */}
      <View style={styles.content}>
        <Text style={[styles.username, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          @{user.username}
        </Text>
        {user.name ? (
          <Text style={[styles.displayName, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {user.name}
          </Text>
        ) : null}
      </View>

      {/* Invite / Cancel button */}
      {invited ? (
        <Pressable
          onPress={() => {
            Alert.alert(
              t("invites.cancelInvite"),
              t("invites.cancelInviteConfirm", { username: user.username }),
              [
                { text: t("common.cancel"), style: "cancel" },
                {
                  text: t("invites.cancelInvite"),
                  style: "destructive",
                  onPress: onCancelInvite,
                },
              ],
            );
          }}
          disabled={isCancelling}
          style={({ pressed }) => [
            styles.roundBtn,
            { borderColor: theme.colors.textSecondary + "30" },
            pressed && { opacity: 0.6 },
            isCancelling && { opacity: 0.4 },
          ]}
        >
          <Ionicons name="remove" size={18} color={theme.colors.textSecondary} />
        </Pressable>
      ) : (
        <Pressable
          onPress={onInvite}
          disabled={isSending}
          style={({ pressed }) => [
            styles.roundBtn,
            { borderColor: theme.colors.textPrimary + "20" },
            pressed && { opacity: 0.6 },
            isSending && { opacity: 0.4 },
          ]}
        >
          <Ionicons name="add" size={18} color={theme.colors.textPrimary} />
        </Pressable>
      )}
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
  avatarWrapper: {
    position: "relative",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  checkBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fff", // overridden inline with theme
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
  displayName: {
    fontSize: 12,
    fontWeight: "500",
  },
  roundBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
