// components/FloatingTabBar.tsx
// Custom floating tab bar with blur effect and rounded corners

import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { useSetAtom, useAtomValue } from "jotai";
import { useTheme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { HapticTab } from "./haptic-tab";
import { AppText } from "./ui";
import {
  useHasSelectionForMode,
  useSelectionLabelForMode,
} from "@/features/group-creation/hooks/useSelectionState";
import { useMyGroupsQuery, useUnreadCountsQuery } from "@/domains/groups";
import { currentSelectionModeAtom } from "@/features/group-creation/selection/mode.atom";
import { createGroupModalVisibleAtom } from "@/features/group-creation/screens/create-group-modal.atom";

export function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { theme, colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const currentMode = useAtomValue(currentSelectionModeAtom);
  const setModalVisible = useSetAtom(createGroupModalVisibleAtom);
  const hasSelection = useHasSelectionForMode(currentMode);
  const selectionCount = useSelectionLabelForMode(currentMode);
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

  // Extract count number from label (e.g., "3 Games" -> 3)
  const countNumber = selectionCount
    ? parseInt(selectionCount.split(" ")[0], 10) || 0
    : 0;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View
        style={[
          styles.tabBar,
          {
            borderRadius: 99,
            borderColor: theme.colors.border,
          },
        ]}
        pointerEvents="box-none"
      >
        <BlurView
          intensity={80}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.content}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;

            const onPress = () => {
              // Special handling for home tab when there's a selection
              if (route.name === "home" && hasSelection) {
                // If we're already on home tab, open the modal
                if (isFocused) {
                  setModalVisible(true);
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
                  ) : (
                    iconName && (
                      <Ionicons
                        name={iconName as any}
                        size={24}
                        color={color}
                      />
                    )
                  )}
                  {route.name === "groups" &&
                    groupsNeedAttention &&
                    totalUnreadCount === 0 && (
                      <View style={styles.attentionDot} pointerEvents="none" />
                    )}
                  {route.name === "groups" &&
                    draftCount > 0 &&
                    !groupsNeedAttention &&
                    totalUnreadCount === 0 && (
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
              </HapticTab>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 32,
    right: 32,
    bottom: 30,
    alignItems: "center",
    zIndex: 1000,
    // Shadow for iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    // Elevation for Android
    elevation: 10,
  },
  tabBar: {
    overflow: "hidden",
    borderWidth: 1,
    width: "100%",
    minHeight: 56,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 0,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
    paddingVertical: 8,
  },
  tabContent: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
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
