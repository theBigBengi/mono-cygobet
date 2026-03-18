// features/invites/components/InviteCard.tsx
// Single invite in inbox: group name, inviter, message, expires, Accept/Decline.

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { AppText, Button } from "@/components/ui";
import { useTheme, getShadowStyle } from "@/lib/theme";
import { getInitials } from "@/utils/string";
import type { ApiInviteItem } from "@repo/types";

interface InviteCardProps {
  invite: ApiInviteItem;
  onAccept: () => void;
  onDecline: () => void;
  onPreview?: () => void;
  isResponding?: boolean;
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
  onPreview,
  isResponding,
}: InviteCardProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  const expiresText = formatExpires(invite.expiresAt, t);
  const isExpired = expiresText === t("invites.expired");
  const preview = invite.groupPreview;

  return (
    <View style={styles.cardWrapper}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.cardBackground,
            ...getShadowStyle("sm"),
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
                color={isExpired ? theme.colors.danger : theme.colors.textSecondary}
              />
              <AppText
                variant="caption"
                style={[
                  styles.expiresText,
                  { color: isExpired ? theme.colors.danger : theme.colors.textSecondary },
                ]}
              >
                {expiresText}
              </AppText>
            </View>
          </View>
        </View>

        {/* Inline stats row */}
        {preview ? (
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Ionicons
                name="people-outline"
                size={13}
                color={theme.colors.textSecondary}
              />
              <AppText variant="caption" color="secondary" style={styles.statText}>
                {t("invites.membersOfMax", {
                  count: preview.memberCount,
                  max: preview.maxMembers,
                })}
              </AppText>
            </View>
            <AppText variant="caption" color="secondary">
              ·
            </AppText>
            <View style={styles.statChip}>
              <Ionicons
                name="football-outline"
                size={13}
                color={theme.colors.textSecondary}
              />
              <AppText variant="caption" color="secondary" style={styles.statText}>
                {t("invites.gamesCount", { count: preview.totalFixtures })}
              </AppText>
            </View>
            <View style={styles.statPills}>
              <View
                style={[
                  styles.pill,
                  { backgroundColor: theme.colors.primary + "18" },
                ]}
              >
                <AppText
                  variant="caption"
                  style={[styles.pillText, { color: theme.colors.primary }]}
                >
                  {preview.status === "active" ? t("groups.active") : preview.status}
                </AppText>
              </View>
              <Ionicons
                name={preview.privacy === "private" ? "lock-closed" : "globe-outline"}
                size={13}
                color={theme.colors.textSecondary}
              />
            </View>
          </View>
        ) : null}

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
                source={invite.inviter.image}
                style={styles.avatarImage}
                cachePolicy="disk"
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
          {onPreview ? (
            <Pressable
              onPress={onPreview}
              style={[
                styles.previewBtn,
                { backgroundColor: theme.colors.surface },
              ]}
              hitSlop={4}
            >
              <Ionicons
                name="information-circle-outline"
                size={22}
                color={theme.colors.primary}
              />
            </Pressable>
          ) : null}
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
    borderRadius: 18,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  groupIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginEnd: 12,
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
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 12,
  },
  statPills: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginStart: "auto",
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pillText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
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
    marginEnd: 10,
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
    borderRadius: 14,
    marginBottom: 14,
  },
  messageIcon: {
    marginEnd: 8,
    marginTop: 2,
  },
  messageText: {
    flex: 1,
    fontStyle: "italic",
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  acceptBtn: {
    flex: 1,
  },
  declineBtn: {
    flex: 1,
  },
  previewBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
