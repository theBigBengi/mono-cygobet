// features/groups/group-lobby/components/LobbyQuickActions.tsx
// Compact pill-row quick action buttons.

import React, { useEffect } from "react";
import { View, ScrollView, StyleSheet, Pressable, Text } from "react-native";
import { Ionicons, Entypo, Fontisto } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/lib/theme";

export interface QuickAction {
  icon: "chat" | "link" | "stats" | "activity";
  label: string;
  badge?: number;
  onPress: () => void;
}

export interface LobbyQuickActionsProps {
  actions: QuickAction[];
  isLoading?: boolean;
}

function renderIcon(icon: QuickAction["icon"], color: string, size: number) {
  switch (icon) {
    case "chat":
      return <Ionicons name="chatbubbles-outline" size={size} color={color} />;
    case "link":
      return <Ionicons name="link-outline" size={size} color={color} />;
    case "stats":
      return <Fontisto name="list-1" size={size - 3} color={color} />;
    case "activity":
      return <Ionicons name="newspaper-outline" size={size} color={color} />;
  }
}

function LobbyQuickActionsInner({
  actions,
  isLoading = false,
}: LobbyQuickActionsProps) {
  const { theme } = useTheme();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    if (isLoading) {
      opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
    }
  }, [isLoading, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.row}>
          {[0, 1, 2].map((i) => (
            <Animated.View
              key={i}
              style={[
                styles.skeletonPill,
                { backgroundColor: theme.colors.border },
                animatedStyle,
              ]}
            />
          ))}
        </View>
      </View>
    );
  }

  const leftActions = actions.filter((a) => a.icon !== "link");
  const rightActions = actions.filter((a) => a.icon === "link");

  const renderAction = (action: QuickAction, index: number) => {
    const hasBadge = action.badge != null && action.badge > 0;
    return (
      <Pressable
        key={index}
        onPress={action.onPress}
        style={({ pressed }) => [
          styles.pill,
          {
            backgroundColor: pressed
              ? theme.colors.textPrimary + "10"
              : "transparent",
          },
        ]}
      >
        {renderIcon(action.icon, theme.colors.textSecondary, 22)}
        {hasBadge && (
          <View
            style={[
              styles.badge,
              { backgroundColor: theme.colors.danger },
            ]}
          >
            <Text style={styles.badgeText}>
              {action.badge! > 99 ? "99+" : action.badge}
            </Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.leftGroup}>
          {leftActions.map(renderAction)}
        </View>
        {rightActions.length > 0 && (
          <View style={styles.rightGroup}>
            {rightActions.map((action, index) => (
              <Pressable
                key={index}
                onPress={action.onPress}
                style={({ pressed }) => [
                  styles.invitePill,
                  {
                    backgroundColor: theme.colors.textPrimary,
                  },
                  pressed && styles.pressed,
                ]}
              >
                {renderIcon(action.icon, "#FFFFFF", 24)}
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

export const LobbyQuickActions = React.memo(LobbyQuickActionsInner);

const styles = StyleSheet.create({
  container: {
    marginTop: 2,
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  leftGroup: {
    flexDirection: "row",
    gap: 8,
  },
  rightGroup: {
    flexDirection: "row",
  },
  invitePill: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.7,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  pillLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 10,
  },
  skeletonPill: {
    width: 90,
    height: 36,
    borderRadius: 20,
  },
});
