// features/groups/group-lobby/components/LobbyQuickActions.tsx
// Grid of 3 quick action buttons (Chat, Invite, Stats) - Game menu style.

import React, { useEffect } from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons, Entypo, Fontisto } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/lib/theme";

export interface QuickAction {
  icon: "chat" | "link" | "stats";
  label: string;
  badge?: number;
  onPress: () => void;
}

export interface LobbyQuickActionsProps {
  actions: QuickAction[];
  isLoading?: boolean;
}

function renderIcon(
  icon: QuickAction["icon"],
  color: string,
  size: number
) {
  switch (icon) {
    case "chat":
      return <Entypo name="chat" size={size} color={color} />;
    case "link":
      return <Ionicons name="link-outline" size={size} color={color} />;
    case "stats":
      return <Fontisto name="list-1" size={size - 4} color={color} />;
  }
}

export function LobbyQuickActions({ actions, isLoading = false }: LobbyQuickActionsProps) {
  const { t } = useTranslation("common");
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
        <View
          style={[
            styles.wrapper,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {/* Skeleton Header */}
          <View style={styles.sectionHeader}>
            <Animated.View
              style={[
                styles.skeletonHeaderIcon,
                { backgroundColor: theme.colors.border },
                animatedStyle,
              ]}
            />
            <Animated.View
              style={[
                styles.skeletonHeaderText,
                { backgroundColor: theme.colors.border },
                animatedStyle,
              ]}
            />
          </View>

          {/* Skeleton Cards Grid */}
          <View style={styles.grid}>
            {[0, 1, 2].map((index) => (
              <View
                key={index}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.colors.cardBackground,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.skeletonCircle,
                    { backgroundColor: theme.colors.border },
                    animatedStyle,
                  ]}
                />
                <Animated.View
                  style={[
                    styles.skeletonLabel,
                    { backgroundColor: theme.colors.border },
                    animatedStyle,
                  ]}
                />
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

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
        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Ionicons name="flash-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            {t("lobby.quickActions")}
          </Text>
        </View>

        {/* Cards Grid */}
        <View style={styles.grid}>
          {actions.map((action, index) => (
            <Pressable
              key={index}
              onPress={action.onPress}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: theme.colors.cardBackground,
                  borderColor: theme.colors.border,
                },
                pressed && styles.pressed,
              ]}
            >
              {/* Badge */}
              {action.badge != null && action.badge > 0 && (
                <View
                  style={[styles.badge, { backgroundColor: theme.colors.danger }]}
                >
                  <Text style={styles.badgeText}>
                    {action.badge > 99 ? "99+" : action.badge}
                  </Text>
                </View>
              )}

              {/* Icon */}
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: theme.colors.primary + "15" },
                ]}
              >
                {renderIcon(action.icon, theme.colors.primary, 24)}
              </View>

              {/* Label */}
              <Text
                style={[styles.label, { color: theme.colors.textPrimary }]}
                numberOfLines={1}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  wrapper: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  grid: {
    flexDirection: "row",
    gap: 10,
  },
  card: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    position: "relative",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
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
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  skeletonHeaderIcon: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  skeletonHeaderText: {
    width: 80,
    height: 12,
    borderRadius: 4,
  },
  skeletonCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 8,
  },
  skeletonLabel: {
    width: 50,
    height: 12,
    borderRadius: 4,
  },
});
