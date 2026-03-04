// features/groups/group-lobby/components/LobbyActivityBanner.tsx
// Activity feed preview shown at the bottom of the group lobby.

import React, { useMemo } from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/lib/theme";
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
      return "checkmark";
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
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: colors.textPrimary }]}>
        <Ionicons name={iconName} size={13} color="#FFFFFF" />
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
          },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
          {t("lobby.activity")}
        </Text>

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
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            {t("activity.empty")}
          </Text>
        )}

        {/* View All Button - only when there's activity */}
        {hasItems && <View style={styles.viewAllContainer}>
          <Pressable
            onPress={onPress}
            style={({ pressed }) => [
              styles.viewAllButton,
              {
                borderColor: theme.colors.border,
              },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.buttonText, { color: theme.colors.textPrimary }]}>
              See all
            </Text>
          </Pressable>
        </View>}
      </View>
    </View>
  );
}

export const LobbyActivityBanner = React.memo(LobbyActivityBannerInner);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  wrapper: {
    borderRadius: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
  list: {
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 5,
  },
  rowIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
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
  viewAllContainer: {
    alignItems: "center",
  },
  viewAllButton: {
    paddingVertical: 7,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  buttonIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 13,
    fontWeight: "700",
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
