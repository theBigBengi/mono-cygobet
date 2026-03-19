// features/groups/activity/components/ActivityEventCard.tsx
// Single event card for the group activity feed.

import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { formatRelativeTime } from "@/utils/date";
import type { ApiGroupActivityItem } from "@repo/types";

interface ActivityEventCardProps {
  item: ApiGroupActivityItem;
}

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

function getEventIcon(eventType: string): IoniconsName {
  switch (eventType) {
    case "member_joined":
      return "person-add";
    case "member_left":
      return "person-remove";
    case "rules_changed":
      return "settings";
    case "games_added":
    case "fixtures_synced":
      return "add-circle";
    case "games_removed":
      return "remove-circle";
    case "group_info_changed":
      return "create";
    case "group_published":
      return "rocket";
    case "fixture_live":
      return "football";
    case "fixture_ft":
      return "checkmark-circle";
    default:
      return "ellipse";
  }
}

function getEventColor(eventType: string, colors: import("@/lib/theme/colors").Colors): string {
  switch (eventType) {
    case "member_joined":
    case "group_published":
      return colors.success ?? "#22c55e";
    case "member_left":
    case "games_removed":
      return colors.danger ?? "#ef4444";
    case "fixture_live":
      return colors.warning ?? "#f59e0b";
    case "fixture_ft":
    case "fixtures_synced":
      return colors.primary;
    default:
      return colors.textSecondary;
  }
}

export function ActivityEventCard({ item }: ActivityEventCardProps) {
  const { theme } = useTheme();
  const iconName = getEventIcon(item.eventType);
  const iconColor = getEventColor(item.eventType, theme.colors);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        gap: theme.spacing.ms,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.border,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: theme.radius.full,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: iconColor + "18",
        }}
      >
        <Ionicons name={iconName} size={18} color={iconColor} />
      </View>

      <View style={[styles.center, { gap: theme.spacing.xxs }]}>
        <AppText variant="body" numberOfLines={2}>
          {item.body}
        </AppText>
        {item.actor?.username && (
          <AppText variant="caption" color="secondary">
            {item.actor.username}
          </AppText>
        )}
      </View>

      <AppText variant="caption" color="secondary" style={{ marginStart: theme.spacing.xs }}>
        {formatRelativeTime(item.createdAt)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
  },
});
