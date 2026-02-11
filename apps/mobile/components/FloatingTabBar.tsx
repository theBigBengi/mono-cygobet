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
import { useMyGroupsQuery, useUnreadCountsQuery } from "@/domains/groups";
import { tabBarBadgeAtom } from "@/lib/state/tabBarBadge.atom";

export function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const badge = useAtomValue(tabBarBadgeAtom);
  const { data: groupsData } = useMyGroupsQuery();
  const { data: unreadData } = useUnreadCountsQuery();

  const totalUnreadCount = useMemo(() => {
    const counts = unreadData?.data ?? {};
    return Object.values(counts).reduce((sum, c) => sum + c, 0);
  }, [unreadData]);

  const groupsNeedAttention = useMemo(() => {
    const groups = groupsData?.data ?? [];
    return groups.some(
      (g) => (g.liveGamesCount ?? 0) > 0 || (g.todayUnpredictedCount ?? 0) > 0
    );
  }, [groupsData]);

  const draftCount = useMemo(() => {
    const groups = groupsData?.data ?? [];
    return groups.filter((g) => g.status === "draft").length;
  }, [groupsData]);

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
                  {showBadge ? (
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: theme.colors.primary,
                        },
                      ]}
                      pointerEvents="none"
                    >
                      <AppText
                        variant="body"
                        style={[
                          styles.badgeText,
                          {
                            color: theme.colors.primaryText,
                            fontWeight: "600",
                          },
                        ]}
                      >
                        {countNumber}
                      </AppText>
                    </View>
                  ) : iconName ? (
                    <Ionicons name={iconName as any} size={24} color={color} />
                  ) : null}
                  {route.name === "groups" && groupsNeedAttention && (
                    <View style={styles.attentionDot} pointerEvents="none" />
                  )}
                  {route.name === "groups" && draftCount > 0 && (
                    <View
                      style={[styles.attentionDot, styles.draftDot]}
                      pointerEvents="none"
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
                <AppText numberOfLines={1} style={[styles.tabLabel, { color }]}>
                  {label}
                </AppText>
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
    justifyContent: "space-between",
    paddingHorizontal: 0,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  tabContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  tabIconRow: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  attentionDot: {
    position: "absolute",
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  draftDot: {
    right: undefined,
    left: -4,
    backgroundColor: "#F59E0B",
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 16,
  },
});
