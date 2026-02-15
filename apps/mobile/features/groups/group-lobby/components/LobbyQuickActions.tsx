// features/groups/group-lobby/components/LobbyQuickActions.tsx
// Grid of 3 quick action buttons (Chat, Invite, Stats).

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Ionicons, Entypo, Fontisto } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";

export interface QuickAction {
  icon: "chat" | "link" | "stats";
  label: string;
  badge?: number;
  onPress: () => void;
}

export interface LobbyQuickActionsProps {
  actions: QuickAction[];
}

function renderIcon(
  icon: QuickAction["icon"],
  theme: ReturnType<typeof useTheme>["theme"],
  size: number
) {
  switch (icon) {
    case "chat":
      return <Entypo name="chat" size={size} color={theme.colors.primary} />;
    case "link":
      return (
        <Ionicons
          name="link-outline"
          size={size}
          color={theme.colors.primary}
        />
      );
    case "stats":
      return (
        <Fontisto name="list-1" size={size - 2} color={theme.colors.primary} />
      );
  }
}

export function LobbyQuickActions({ actions }: LobbyQuickActionsProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.list, { backgroundColor: theme.colors.surface }]}>
      {actions.map((action, index) => (
        <Pressable
          key={index}
          onPress={action.onPress}
          style={({ pressed }) => [
            styles.row,
            index < actions.length - 1 && {
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: theme.colors.border,
            },
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.iconWrap}>
            {renderIcon(action.icon, theme, 20)}
            {action.badge != null && action.badge > 0 && (
              <View
                style={[styles.badge, { backgroundColor: theme.colors.danger }]}
              >
                <AppText
                  variant="caption"
                  style={styles.badgeText}
                  numberOfLines={1}
                >
                  {action.badge > 99 ? "99+" : action.badge}
                </AppText>
              </View>
            )}
          </View>
          <AppText
            variant="body"
            style={[styles.label, { color: theme.colors.textPrimary }]}
          >
            {action.label}
          </AppText>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={theme.colors.textSecondary}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    marginVertical: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  pressed: {
    opacity: 0.6,
  },
  iconWrap: {
    position: "relative",
    width: 28,
  },
  label: {
    flex: 1,
    fontWeight: "500",
    marginLeft: 12,
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 11,
  },
});
