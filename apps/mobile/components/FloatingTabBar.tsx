// components/FloatingTabBar.tsx
// Standard docked bottom tab bar — icon + label per tab.

import React, { useMemo } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "./ui";
import { useUnreadCountsQuery } from "@/domains/groups";

const ICON_MAP: Record<string, { default: string; focused: string }> = {
  groups: { default: "people-outline", focused: "people" },
  journey: { default: "trail-sign-outline", focused: "trail-sign" },
  settings: { default: "settings-outline", focused: "settings" },
};

/** Routes hidden from the tab bar (href: null in layout). */
const HIDDEN_TABS = new Set(["activity", "profile", "home"]);

export function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: unreadData } = useUnreadCountsQuery();

  const totalUnreadCount = useMemo(() => {
    const counts = unreadData?.data ?? {};
    return Object.values(counts).reduce((sum, c) => sum + c, 0);
  }, [unreadData]);

  const handlePress = (route: typeof state.routes[0], isFocused: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  const surfaceColor = theme.colors.background;

  return (
    <LinearGradient
      colors={[surfaceColor + "F2", surfaceColor, surfaceColor]}
      locations={[0, 0.4, 1]}
      style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}
    >
      {state.routes
        .filter((route) => !HIDDEN_TABS.has(route.name))
        .map((route) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === state.routes.indexOf(route);
          const icons = ICON_MAP[route.name];
          const iconName = icons
            ? isFocused ? icons.focused : icons.default
            : null;
          const label = options.tabBarLabel as string | undefined
            ?? options.title
            ?? route.name;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={() => handlePress(route, isFocused)}
              style={styles.tab}
            >
              <View style={styles.iconWrap}>
                <Ionicons
                  name={iconName as React.ComponentProps<typeof Ionicons>["name"]}
                  size={26}
                  color={
                    isFocused
                      ? theme.colors.textPrimary
                      : theme.colors.textSecondary
                  }
                />
                {route.name === "groups" && totalUnreadCount > 0 && (
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: theme.colors.primary,
                        borderColor: theme.colors.background,
                      },
                    ]}
                    pointerEvents="none"
                  >
                    <AppText
                      variant="caption"
                      style={[
                        styles.badgeText,
                        { color: theme.colors.primaryText },
                      ]}
                    >
                      {totalUnreadCount > 99 ? "99+" : String(totalUnreadCount)}
                    </AppText>
                  </View>
                )}
              </View>
              <AppText
                variant="caption"
                style={[
                  styles.label,
                  {
                    color: isFocused
                      ? theme.colors.textPrimary
                      : theme.colors.textSecondary,
                    fontWeight: isFocused ? "700" : "500",
                  },
                ]}
                numberOfLines={1}
              >
                {label}
              </AppText>
              {isFocused && (
                <View
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: theme.radius.xs,
                    backgroundColor: theme.colors.primary,
                    marginTop: theme.spacing.xxs,
                  }}
                />
              )}
            </Pressable>
          );
        })}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 20,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  iconWrap: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -10,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
});
