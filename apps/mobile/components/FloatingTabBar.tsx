// components/FloatingTabBar.tsx
// Game-like floating bottom tab bar with 3D effects

import React, { useMemo } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAtomValue } from "jotai";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "./ui";
import { useUnreadCountsQuery } from "@/domains/groups";
import { tabBarBadgeAtom } from "@/lib/state/tabBarBadge.atom";

export function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const badge = useAtomValue(tabBarBadgeAtom);
  const { data: unreadData } = useUnreadCountsQuery();

  const totalUnreadCount = useMemo(() => {
    const counts = unreadData?.data ?? {};
    return Object.values(counts).reduce((sum, c) => sum + c, 0);
  }, [unreadData]);

  const hasSelection = badge.visible;
  const countNumber = badge.count;

  const handlePress = (route: typeof state.routes[0], isFocused: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Special handling for home tab when there's a selection
    if (route.name === "home" && hasSelection) {
      if (isFocused) {
        badge.onActiveTap?.();
        return;
      }
    }

    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  return (
    <View
      style={[
        styles.outerContainer,
        { bottom: Math.max(insets.bottom, 12) },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderBottomColor: theme.colors.textSecondary + "40",
            shadowColor: "#000",
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const isHomeTab = route.name === "home";
          const showBadge = isHomeTab && hasSelection;

          const iconName =
            route.name === "home"
              ? "add"
              : route.name === "groups"
                ? "people"
                : route.name === "activity"
                  ? "flash"
                  : route.name === "profile"
                    ? "person"
                    : route.name === "settings"
                      ? "settings-outline"
                      : null;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={() => handlePress(route, isFocused)}
              style={({ pressed }) => [
                styles.tab,
                isHomeTab && styles.homeTab,
                isHomeTab && {
                  backgroundColor: showBadge
                    ? theme.colors.success
                    : theme.colors.primary,
                  borderColor: showBadge
                    ? theme.colors.success
                    : theme.colors.primary,
                  shadowColor: showBadge
                    ? theme.colors.success
                    : theme.colors.primary,
                  shadowOpacity: pressed ? 0 : 0.4,
                  transform: [{ scale: pressed ? 0.92 : 1 }],
                },
                !isHomeTab && {
                  backgroundColor: isFocused
                    ? theme.colors.primary + "15"
                    : "transparent",
                  transform: [{ scale: pressed ? 0.9 : 1 }],
                },
              ]}
            >
              <View
                style={[
                  styles.iconCircle,
                  !isHomeTab && isFocused && {
                    backgroundColor: theme.colors.primary,
                  },
                ]}
              >
                {showBadge ? (
                  <Ionicons
                    name="checkmark"
                    size={28}
                    color="#fff"
                  />
                ) : (
                  <Ionicons
                    name={iconName as any}
                    size={isHomeTab ? 28 : 22}
                    color={
                      isHomeTab
                        ? "#fff"
                        : isFocused
                          ? "#fff"
                          : theme.colors.textSecondary
                    }
                  />
                )}
              </View>
              {route.name === "groups" && totalUnreadCount > 0 && (
                <View
                  style={[
                    styles.unreadCountBadge,
                    { backgroundColor: theme.colors.primary },
                  ]}
                  pointerEvents="none"
                >
                  <AppText
                    variant="caption"
                    style={[
                      styles.unreadCountText,
                      { color: theme.colors.primaryText },
                    ]}
                  >
                    {totalUnreadCount > 99 ? "99+" : String(totalUnreadCount)}
                  </AppText>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  homeTab: {
    width: 52,
    height: 52,
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderBottomWidth: 3,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 6,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadCountBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  unreadCountText: {
    fontSize: 10,
    fontWeight: "700",
  },
});
