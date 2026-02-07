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
    <View style={styles.grid}>
      {actions.map((action, index) => (
        <Pressable
          key={index}
          onPress={action.onPress}
          style={({ pressed }) => [
            styles.cell,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.iconWrap}>
            {renderIcon(action.icon, theme, 24)}
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
            variant="caption"
            color="secondary"
            style={styles.label}
            numberOfLines={1}
          >
            {action.label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  cell: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.8,
  },
  iconWrap: {
    position: "relative",
    marginBottom: 6,
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
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
  label: {
    fontWeight: "600",
  },
});
