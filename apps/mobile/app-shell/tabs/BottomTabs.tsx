// src/app-shell/tabs/BottomTabs.tsx
// Render-only bottom tabs component.
// Handles keyboard visibility and animations.
// No business logic, only presentation.

import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  Keyboard,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useTabsStore } from "./tabs.store";
import { TABS_CONFIG, TAB_ICONS } from "./tabs.config";
import type { TabId } from "./tabs.types";

/**
 * BottomTabs component.
 * Renders the bottom tab bar with keyboard handling.
 *
 * KEYBOARD HANDLING:
 * - Tabs fade out when keyboard opens
 * - Tabs fade back in when keyboard closes
 * - Animation is smooth and non-blocking
 */
export function BottomTabs() {
  const { state } = useTabsStore();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Handle keyboard visibility
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        // Fade out tabs when keyboard opens
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        // Fade in tabs when keyboard closes
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [fadeAnim]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          paddingBottom: insets.bottom,
          opacity: fadeAnim,
        },
      ]}
    >
      <View style={styles.tabsRow}>
        {TABS_CONFIG.map((tab) => (
          <TabButton
            key={tab.id}
            tab={{
              id: tab.id,
              label: tab.label,
              iconName: tab.icon, // Icon name from config
            }}
            isActive={state.activeTab === tab.id}
          />
        ))}
      </View>
    </Animated.View>
  );
}

interface TabButtonProps {
  tab: {
    id: TabId;
    label: string;
    iconName: string; // Icon name (will be rendered with @expo/vector-icons)
  };
  isActive: boolean;
}

function TabButton({ tab, isActive }: TabButtonProps) {
  const { setActiveTab, getTabLastRoute } = useTabsStore();
  const { theme } = useTheme();
  const router = useRouter();
  const iconConfig = TAB_ICONS[tab.id];

  const handlePress = () => {
    const tabConfig = TABS_CONFIG.find((t) => t.id === tab.id);
    if (!tabConfig) return;

    if (isActive) {
      // Pressing active tab: navigate to root route
      router.push(tabConfig.rootRoute as any);
    } else {
      // Pressing inactive tab: switch tab and restore last visited route
      const lastRoute = getTabLastRoute(tab.id);
      setActiveTab(tab.id);
      router.push(lastRoute as any);
    }
  };

  // Icon color based on active/inactive state
  const iconColor = isActive
    ? theme.colors.primary
    : theme.colors.textSecondary;

  // Render icon based on family (currently only Ionicons is used)
  const renderIcon = () => {
    if (!iconConfig) return null;

    if (iconConfig.family === "Ionicons") {
      return (
        <Ionicons
          name={iconConfig.name as keyof typeof Ionicons.glyphMap}
          size={24}
          color={iconColor}
        />
      );
    }

    return null;
  };

  return (
    <Pressable
      style={styles.tabButton}
      onPress={handlePress}
      android_ripple={{ color: theme.colors.border }}
    >
      <View style={styles.tabContent}>
        <View style={styles.tabIcon}>{renderIcon()}</View>
        <AppText variant="caption" color={isActive ? "primary" : "secondary"}>
          {tab.label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderTopWidth: 1,
    zIndex: 1000,
  },
  tabsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    height: 56,
  },
  tabButton: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  tabContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  tabIcon: {
    marginBottom: 4,
  },
});
