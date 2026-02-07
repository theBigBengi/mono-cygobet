// features/groups/group-lobby/components/GroupLobbyHeader.tsx
// Group header for lobby screen - displays avatar, name, and stats.

import React from "react";
import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { Card, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { ApiGroupStatus } from "@repo/types";

interface GroupLobbyHeaderProps {
  name: string;
  memberCount?: number;
  status: ApiGroupStatus;
  /** When true: no Card, smaller avatar (56), no status line (member count only), paddingBottom 16 */
  compact?: boolean;
  /** Future: group image URL */
  image?: string | null;
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
  compact = false,
  image: _image,
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

  const content = (
    <View style={[styles.container, compact && styles.containerCompact]}>
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

      <AppText
        variant="title"
        style={[styles.name, compact && styles.nameCompact]}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {name}
      </AppText>

      <View style={styles.metaRow}>
        {memberCount != null && memberCount > 0 && (
          <AppText variant="caption" color="secondary">
            {t("lobby.memberCount", { count: memberCount })}
          </AppText>
        )}
        {!compact && memberCount != null && memberCount > 0 && (
          <AppText variant="caption" color="secondary" style={styles.separator}>
            •
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
    paddingBottom: 16,
  },
  container: {
    alignItems: "center",
    paddingVertical: 8,
  },
  containerCompact: {
    paddingVertical: 4,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarCompact: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 8,
  },
  initials: {
    fontWeight: "700",
    fontSize: 28,
  },
  initialsCompact: {
    fontSize: 22,
  },
  name: {
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  nameCompact: {
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  separator: {
    marginHorizontal: 6,
  },
});
