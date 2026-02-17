// features/profile/components/InvitesBadgeButton.tsx
// Button with badge showing pending invite count; navigates to invites inbox.

import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { useMyInvitesQuery } from "@/domains/invites";
import { useTheme } from "@/lib/theme";

export function InvitesBadgeButton() {
  const { theme } = useTheme();
  const router = useRouter();
  const { data } = useMyInvitesQuery({ status: "pending" });
  const pendingCount = data?.data?.pendingCount ?? 0;

  return (
    <Pressable
      onPress={() => router.push("/invites" as any)}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={styles.row}>
        <Ionicons
          name="mail-unread-outline"
          size={22}
          color={theme.colors.primary}
        />
        <AppText
          variant="body"
          style={[styles.label, { color: theme.colors.textPrimary }]}
        >
          {t("invites.invitations")}
        </AppText>
        {pendingCount > 0 && (
          <View
            style={[styles.badge, { backgroundColor: theme.colors.primary }]}
          >
            <AppText
              variant="caption"
              style={[styles.badgeText, { color: theme.colors.primaryText }]}
            >
              {pendingCount > 99 ? "99+" : pendingCount}
            </AppText>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    marginLeft: 10,
    fontWeight: "600",
    flex: 1,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    fontWeight: "700",
    fontSize: 12,
  },
});
