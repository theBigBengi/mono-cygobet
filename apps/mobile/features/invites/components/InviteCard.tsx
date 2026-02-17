// features/invites/components/InviteCard.tsx
// Single invite in inbox: group name, inviter, message, expires, Accept/Decline.

import React from "react";
import { View, StyleSheet, Image, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { AppText, Button } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { ApiInviteItem } from "@repo/types";

interface InviteCardProps {
  invite: ApiInviteItem;
  onAccept: () => void;
  onDecline: () => void;
  isResponding?: boolean;
}

function getInitials(username: string | null): string {
  if (!username?.trim()) return "?";
  return username.slice(0, 2).toUpperCase();
}

function formatExpires(
  expiresAt: string,
  t: (key: string, opts?: { days?: number }) => string
): string {
  const d = new Date(expiresAt);
  const now = new Date();
  const days = Math.ceil((d.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return t("invites.expired");
  if (days === 1) return t("invites.expiresInOne");
  return t("invites.expiresIn", { days });
}

export function InviteCard({
  invite,
  onAccept,
  onDecline,
  isResponding,
}: InviteCardProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  const expiresText = formatExpires(invite.expiresAt, t);
  const isExpired = expiresText === t("invites.expired");

  return (
    <View style={styles.cardWrapper}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.cardBackground,
            borderColor: theme.colors.border,
            shadowColor: "#000",
          },
        ]}
      >
        {/* Header: Group icon + name */}
        <View style={styles.header}>
          <View
            style={[
              styles.groupIcon,
              { backgroundColor: theme.colors.primary + "15" },
            ]}
          >
            <Ionicons name="people" size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.headerText}>
            <AppText variant="body" style={styles.groupName} numberOfLines={1}>
              {invite.groupName}
            </AppText>
            <View style={styles.expiresRow}>
              <Ionicons
                name="time-outline"
                size={12}
                color={isExpired ? theme.colors.error : theme.colors.textSecondary}
              />
              <AppText
                variant="caption"
                style={[
                  styles.expiresText,
                  { color: isExpired ? theme.colors.error : theme.colors.textSecondary },
                ]}
              >
                {expiresText}
              </AppText>
            </View>
          </View>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

        {/* Inviter row */}
        <View style={styles.inviterRow}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            {invite.inviter.image ? (
              <Image
                source={{ uri: invite.inviter.image }}
                style={styles.avatarImage}
                accessibilityIgnoresInvertColors
              />
            ) : (
              <AppText
                style={[styles.initials, { color: theme.colors.textSecondary }]}
              >
                {getInitials(invite.inviter.username)}
              </AppText>
            )}
          </View>
          <View style={styles.inviterInfo}>
            <AppText variant="caption" color="secondary">
              {t("invites.from")}
            </AppText>
            <AppText variant="body" style={styles.username}>
              @{invite.inviter.username ?? "unknown"}
            </AppText>
          </View>
        </View>

        {/* Optional message */}
        {invite.message ? (
          <View
            style={[
              styles.messageBox,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Ionicons
              name="chatbubble-outline"
              size={14}
              color={theme.colors.textSecondary}
              style={styles.messageIcon}
            />
            <AppText
              variant="body"
              color="secondary"
              style={styles.messageText}
              numberOfLines={2}
            >
              {invite.message}
            </AppText>
          </View>
        ) : null}

        {/* Action buttons */}
        <View style={styles.actions}>
          <Button
            label={t("invites.accept")}
            onPress={onAccept}
            disabled={isResponding || isExpired}
            style={styles.acceptBtn}
            icon="checkmark"
          />
          <Button
            label={t("invites.decline")}
            variant="secondary"
            onPress={onDecline}
            disabled={isResponding}
            style={styles.declineBtn}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    marginBottom: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  groupIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  groupName: {
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 2,
  },
  expiresRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  expiresText: {
    fontSize: 11,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  inviterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    overflow: "hidden",
  },
  avatarImage: {
    width: 36,
    height: 36,
  },
  initials: {
    fontSize: 14,
    fontWeight: "600",
  },
  inviterInfo: {
    flex: 1,
  },
  username: {
    fontWeight: "600",
  },
  messageBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  messageIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  messageText: {
    flex: 1,
    fontStyle: "italic",
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  acceptBtn: {
    flex: 1,
  },
  declineBtn: {
    flex: 1,
  },
});
