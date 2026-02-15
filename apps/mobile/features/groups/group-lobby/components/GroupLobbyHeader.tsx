// features/groups/group-lobby/components/GroupLobbyHeader.tsx
// Group header for lobby screen - displays avatar, name, and stats.

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { Card, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { ApiGroupStatus, ApiGroupPrivacy } from "@repo/types";

interface GroupLobbyHeaderProps {
  name: string;
  memberCount?: number;
  status: ApiGroupStatus;
  privacy?: ApiGroupPrivacy;
  /** When true: no Card, smaller avatar (56), no status line (member count only), paddingBottom 16 */
  compact?: boolean;
  /** Future: group image URL */
  image?: string | null;
  /** When provided, shows info icon next to name; onPress opens group info sheet */
  onInfoPress?: () => void;
  /** When provided, shows back button on the left of the avatar */
  onBack?: () => void;
}

function getInitials(name: string): string {
  if (!name || !name.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2);
  }
  return name.slice(0, 2).toUpperCase();
}

export function GroupLobbyHeader({
  name,
  memberCount,
  status,
  privacy,
  compact = false,
  image: _image,
  onInfoPress,
  onBack,
}: GroupLobbyHeaderProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const initials = getInitials(name);

  const STATUS_LABELS: Record<ApiGroupStatus, string> = {
    draft: t("lobby.draft"),
    active: t("lobby.active"),
    ended: t("lobby.ended"),
  };

  const statusLabel = STATUS_LABELS[status] ?? status;

  const statusColor =
    status === "active"
      ? theme.colors.primary
      : status === "ended"
        ? theme.colors.textSecondary
        : theme.colors.warning;

  const privacyLabel = privacy === "public"
    ? t("groupInfo.privacyValues.public")
    : t("groupInfo.privacyValues.private");

  const content = (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {/* {onBack && (
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [
            styles.backButton,
            compact && styles.backButtonCompact,
            pressed && styles.backButtonPressed,
          ]}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={theme.colors.textPrimary}
          />
        </Pressable>
      )} */}
      <View
        style={[
          styles.avatar,
          compact && styles.avatarCompact,
          { backgroundColor: theme.colors.primary },
        ]}
      >
        <AppText
          variant="title"
          style={[
            styles.initials,
            compact && styles.initialsCompact,
            { color: theme.colors.primaryText },
          ]}
        >
          {initials}
        </AppText>
      </View>

      <View style={styles.textContainer}>
        <View style={[styles.nameRow, compact && styles.nameRowCompact]}>
          <AppText
            variant="title"
            style={styles.name}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {name}
          </AppText>
          {/* {onInfoPress && (
            <Pressable
              onPress={onInfoPress}
              hitSlop={8}
              style={({ pressed }) => [
                styles.infoButton,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={theme.colors.textSecondary}
              />
            </Pressable>
          )} */}
        </View>
        {(privacy || memberCount != null) && (
          <AppText variant="caption" color="secondary">
            {privacy ? privacyLabel : ""}{privacy && memberCount != null ? " · " : ""}{memberCount != null ? t("groups.members", { count: memberCount }) : ""}
          </AppText>
        )}
        {!compact && (
          <AppText variant="caption" style={{ color: statusColor }}>
            {statusLabel}
          </AppText>
        )}
      </View>
    </View>
  );

  if (compact) {
    return <View style={styles.compactWrap}>{content}</View>;
  }

  return <Card style={styles.card}>{content}</Card>;
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  compactWrap: {
    paddingBottom: 4,
  },
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: 16,
    paddingBottom: 4,
    paddingHorizontal: 16,
  },
  containerCompact: {
    paddingTop: 16,
    paddingBottom: 4,
  },
  backButton: {
    height: 80,
    justifyContent: "center",
    paddingRight: 8,
  },
  backButtonCompact: {
    height: 64,
  },
  backButtonPressed: {
    opacity: 0.6,
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarCompact: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  initials: {
    fontWeight: "700",
    fontSize: 32,
  },
  initialsCompact: {
    fontSize: 26,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  nameRowCompact: {
    marginBottom: 2,
  },
  name: {
    fontWeight: "700",
    fontSize: 18,
    flexShrink: 1,
  },
  nameCompact: {},
  infoButton: {},
});
