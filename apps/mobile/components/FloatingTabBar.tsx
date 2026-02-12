// components/FloatingTabBar.tsx
// Standard docked bottom tab bar with icons and labels

import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAtomValue } from "jotai";
import { useTheme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { HapticTab } from "./haptic-tab";
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

  return (
    <View
      style={[
        styles.container,
        {
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          paddingBottom: insets.bottom,
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.content} pointerEvents="box-none">
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            // Special handling for home tab when there's a selection
            if (route.name === "home" && hasSelection) {
              // If we're already on home tab, trigger the badge action
              if (isFocused) {
                badge.onActiveTap?.();
                return;
              }
              // If we're not on home tab, navigate to home first
              // (normal navigation will happen below)
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

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          const color = isFocused
            ? theme.colors.primary
            : theme.colors.textSecondary;

          const label =
            options.tabBarLabel !== undefined
              ? typeof options.tabBarLabel === "string"
                ? options.tabBarLabel
                : (options.title ?? route.name)
              : (options.title ?? route.name);

          const iconName =
            route.name === "home"
              ? "add"
              : route.name === "groups"
                ? isFocused
                  ? "people"
                  : "people-outline"
                : route.name === "activity"
                  ? isFocused
                    ? "flash"
                    : "flash-outline"
                  : route.name === "profile"
                    ? isFocused
                      ? "person"
                      : "person-outline"
                    : route.name === "settings"
                      ? isFocused
                        ? "settings"
                        : "settings-outline"
                      : null;

          // Special rendering for home tab with selection
          const showBadge = route.name === "home" && hasSelection;

          return (
            <HapticTab
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tab}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View style={styles.tabContent} pointerEvents="box-none">
                <View style={styles.tabIconRow}>
                  {showBadge && (
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: theme.colors.primary,
                        },
                      ]}
                      pointerEvents="none"
                    >
                      <Ionicons
                        name="checkmark"
                        size={26}
                        color={theme.colors.primaryText}
                      />
                    </View>
                  )}
                  {iconName && (
                    <Ionicons
                      name={iconName as any}
                      size={route.name === "home" ? 32 : 24}
                      color={showBadge ? "transparent" : color}
                    />
                  )}
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
                        {totalUnreadCount > 99
                          ? "99+"
                          : String(totalUnreadCount)}
                      </AppText>
                    </View>
                  )}
                </View>
              </View>
            </HapticTab>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  tabContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  tabIconRow: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  unreadCountBadge: {
    position: "absolute",
    top: -6,
    right: -14,
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
  badge: {
    position: "absolute",
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
});
