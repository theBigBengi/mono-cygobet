// features/groups/group-lobby/components/LobbyActivityBanner.tsx
// Activity feed preview shown at the bottom of the group lobby.

import React, { useMemo } from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme, CARD_BORDER_BOTTOM_WIDTH } from "@/lib/theme";
import { useGroupActivityQuery } from "@/domains/groups";
import { formatRelativeTime } from "@/utils/date";
import type { ApiGroupActivityItem } from "@repo/types";

const PREVIEW_COUNT = 3;

export interface LobbyActivityBannerProps {
  groupId: number;
  unreadCount: number;
  onPress: () => void;
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

function getEventColor(eventType: string, colors: any): string {
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
      return colors.primary;
    default:
      return colors.textSecondary;
  }
}

function ActivityRow({ item, colors, isLast }: { item: ApiGroupActivityItem; colors: any; isLast: boolean }) {
  const iconName = getEventIcon(item.eventType);
  const iconColor = getEventColor(item.eventType, colors);

  return (
    <View style={[styles.row, !isLast && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <View style={[styles.rowIcon, { backgroundColor: iconColor + "18" }]}>
        <Ionicons name={iconName} size={14} color={iconColor} />
      </View>
      <Text style={[styles.rowBody, { color: colors.textPrimary }]} numberOfLines={1}>
        {item.body}
      </Text>
      <Text style={[styles.rowTime, { color: colors.textSecondary }]}>
        {formatRelativeTime(item.createdAt)}
      </Text>
    </View>
  );
}

function LobbyActivityBannerInner({ groupId, unreadCount, onPress }: LobbyActivityBannerProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  const { data, isLoading } = useGroupActivityQuery(groupId);

  const recentItems = useMemo(
    () => (data?.pages.flatMap((p) => p.data.items) ?? []).slice(0, PREVIEW_COUNT),
    [data]
  );

  const borderBottomColor = theme.colors.textSecondary + "40";
  const primaryIconBg = theme.colors.primary + "15";
  const hasItems = recentItems.length > 0;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.wrapper,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderBottomColor,
          },
        ]}
      >
        {/* Activity List */}
        {hasItems ? (
          <View style={styles.list}>
            {recentItems.map((item, index) => (
              <ActivityRow
                key={item.id}
                item={item}
                colors={theme.colors}
                isLast={index === recentItems.length - 1}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="newspaper-outline" size={28} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              {t("activity.empty")}
            </Text>
          </View>
        )}

        {/* View All Button - only when there's activity */}
        {hasItems && <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.viewAllButton,
            {
              backgroundColor: theme.colors.cardBackground,
              borderColor: theme.colors.border,
              borderBottomColor,
              transform: [{ scale: pressed ? 0.96 : 1 }, { translateY: pressed ? 2 : 0 }],
            },
            pressed && styles.pressed,
          ]}
        >
          <View style={[styles.buttonIconCircle, { backgroundColor: primaryIconBg }]}>
            <Ionicons name="newspaper-outline" size={16} color={theme.colors.primary} />
          </View>
          <Text style={[styles.buttonText, { color: theme.colors.textPrimary }]}>
            {t("lobby.activity")}
          </Text>
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: theme.colors.danger }]}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          )}
        </Pressable>}
      </View>
    </View>
  );
}

export const LobbyActivityBanner = React.memo(LobbyActivityBannerInner);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  wrapper: {
    borderRadius: 16,
    borderWidth: 1,
    borderBottomWidth: CARD_BORDER_BOTTOM_WIDTH,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  list: {
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  rowIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
  },
  rowTime: {
    fontSize: 11,
    fontWeight: "500",
    marginLeft: 4,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 8,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: "500",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderBottomWidth: CARD_BORDER_BOTTOM_WIDTH,
  },
  buttonIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 11,
  },
  pressed: {
    opacity: 0.8,
  },
});
