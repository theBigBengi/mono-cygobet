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

  return (
    <Card style={styles.card}>
      <View style={styles.container}>
        {/* Avatar */}
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: theme.colors.primary,
            },
          ]}
        >
          <AppText
            variant="title"
            style={[styles.initials, { color: theme.colors.primaryText }]}
          >
            {initials}
          </AppText>
        </View>

        {/* Group Name */}
        <AppText
          variant="title"
          style={styles.name}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {name}
        </AppText>

        {/* Meta Info */}
        <View style={styles.metaRow}>
          {memberCount != null && memberCount > 0 && (
            <>
              <AppText variant="caption" color="secondary">
                {t("lobby.memberCount", { count: memberCount })}
              </AppText>
              <AppText
                variant="caption"
                color="secondary"
                style={styles.separator}
              >
                •
              </AppText>
            </>
          )}
          <AppText variant="caption" style={{ color: statusColor }}>
            {statusLabel}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  container: {
    alignItems: "center",
    paddingVertical: 8,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  initials: {
    fontWeight: "700",
    fontSize: 28,
  },
  name: {
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
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
