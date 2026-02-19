// components/ui/Screen.tsx
// Consistent screen layout wrapper.
// - Uses SafeAreaView with configurable edges
// - Applies consistent padding and background
// - Optional scroll support
// - Optional pull-to-refresh when scroll + onRefresh provided
//
// SAFE AREA POLICY:
// - By default includes top edge for safe area padding
// - Use safeAreaEdges prop to customize which edges to apply
// - Use extendIntoStatusBar={true} as shorthand to exclude top edge

import React, { useCallback, useState } from "react";
import { Platform, RefreshControl, ScrollView, ViewStyle, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme";

// Tab bar height constant (imported directly to avoid circular dependency)
// This matches the height defined in app-shell/tabs/tabs.constants.ts
const TAB_BAR_HEIGHT = 56;

type SafeAreaEdge = "top" | "bottom" | "left" | "right";

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  contentContainerStyle?: ViewStyle;
  /** Optional. When provided with scroll=true, enables pull-to-refresh. */
  onRefresh?: () => void | Promise<void>;
  /** Optional. Called on scroll with the scroll event. */
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** Optional. Indices of children that should stick to the top when scrolling. */
  stickyHeaderIndices?: number[];
  /**
   * When true, content can extend into the status bar area.
   * Useful for screens with gradient headers that should cover the status bar.
   * Shorthand for safeAreaEdges={["left", "right"]}
   */
  extendIntoStatusBar?: boolean;
  /**
   * Custom safe area edges to apply. Defaults to ["top", "left", "right"].
   * Overrides extendIntoStatusBar if both are provided.
   */
  safeAreaEdges?: SafeAreaEdge[];
}

export function Screen({
  children,
  scroll = false,
  contentContainerStyle,
  onRefresh,
  onScroll,
  extendIntoStatusBar = false,
  stickyHeaderIndices,
  safeAreaEdges: customEdges,
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

  // Determine safe area edges:
  // - If customEdges provided, use those
  // - If extendIntoStatusBar, exclude top edge
  // - Default: include top, left, right (bottom handled by tab bar padding)
  const safeAreaEdges: SafeAreaEdge[] = customEdges
    ?? (extendIntoStatusBar
      ? ["left", "right"]
      : ["top", "left", "right"]);

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

  // When extendIntoStatusBar is true, add paddingTop to content so it doesn't go under status bar
  // But the background can still extend into the status bar area
  const topContentPadding = extendIntoStatusBar ? insets.top : 0;

  if (scroll) {
    return (
      <SafeAreaView
        edges={safeAreaEdges}
        style={{
          flex: 1,
          backgroundColor: extendIntoStatusBar ? "transparent" : theme.colors.background,
        }}
      >
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            {
              paddingTop: topContentPadding,
              paddingBottom: defaultBottomPadding + theme.spacing.md,
            },
            contentContainerStyle,
          ]}
          refreshControl={refreshControl}
          onScroll={onScroll}
          scrollEventThrottle={16}
          stickyHeaderIndices={stickyHeaderIndices}
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
