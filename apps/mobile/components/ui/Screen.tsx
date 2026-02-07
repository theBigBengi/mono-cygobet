// components/ui/Screen.tsx
// Consistent screen layout wrapper.
// - Uses SafeAreaView (excluding top edge - top safe area is handled globally)
// - Applies consistent padding and background
// - Optional scroll support
// - Optional pull-to-refresh when scroll + onRefresh provided
//
// SAFE AREA POLICY:
// - Top edge is excluded because top safe area is handled globally
// - Only bottom/left/right edges apply safe area padding
// - This prevents double top offset

import React, { useCallback, useState } from "react";
import { Platform, RefreshControl, ScrollView, ViewStyle } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme";

// Tab bar height constant (imported directly to avoid circular dependency)
// This matches the height defined in app-shell/tabs/tabs.constants.ts
const TAB_BAR_HEIGHT = 56;

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  contentContainerStyle?: ViewStyle;
  /** Optional. When provided with scroll=true, enables pull-to-refresh. */
  onRefresh?: () => void | Promise<void>;
}

export function Screen({
  children,
  scroll = false,
  contentContainerStyle,
  onRefresh,
}: ScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await Promise.resolve(onRefresh());
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  // Exclude top edge - top safe area is handled globally
  // Exclude bottom edge - bottom safe area is handled globally
  // Only apply safe area to left/right edges
  const safeAreaEdges: ("top" | "bottom" | "left" | "right")[] = [
    "left",
    "right",
  ];

  // Calculate bottom padding to account for floating tab bar (when tabs are visible)
  // This ensures content doesn't get hidden behind the tabs
  // Tab bar height: 60px + safe area bottom inset
  // Plus marginBottom: spacing.sm (8px) for the floating effect
  const tabBarHeight = 60 + insets.bottom;
  const tabBarMarginBottom = theme.spacing.sm; // 8px margin for floating effect
  const totalTabBarSpace = tabBarHeight + tabBarMarginBottom;
  const defaultBottomPadding = scroll ? totalTabBarSpace : 0;

  const refreshControl =
    scroll && onRefresh ? (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={handleRefresh}
        tintColor={theme.colors.primary}
        colors={Platform.OS === "android" ? [theme.colors.primary] : undefined}
      />
    ) : undefined;

  if (scroll) {
    return (
      <SafeAreaView
        edges={safeAreaEdges}
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
        }}
      >
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            {
              // padding: theme.spacing.md,
              paddingBottom: defaultBottomPadding + theme.spacing.md,
            },
            contentContainerStyle,
          ]}
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={safeAreaEdges}
      style={[
        {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        contentContainerStyle?.padding === 0 ||
        contentContainerStyle?.padding === undefined
          ? {}
          : { padding: theme.spacing.md },
        contentContainerStyle?.alignItems === undefined
          ? { alignItems: "center", justifyContent: "center" }
          : {},
        contentContainerStyle,
      ]}
    >
      {children}
    </SafeAreaView>
  );
}
