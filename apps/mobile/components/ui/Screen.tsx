// components/ui/Screen.tsx
// Consistent screen layout wrapper.
// - Uses SafeAreaView (excluding top edge - AppBar handles top safe area)
// - Applies consistent padding and background
// - Optional scroll support
//
// SAFE AREA POLICY:
// - Top edge is excluded because AppBar (wrapped in SafeAreaView) handles it
// - Only bottom/left/right edges apply safe area padding
// - This prevents double top offset when AppBar is visible

import React from "react";
import { ScrollView, ViewStyle } from "react-native";
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
}

export function Screen({
  children,
  scroll = false,
  contentContainerStyle,
}: ScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Exclude top edge - AppBar (in AppShell) handles top safe area
  // Exclude bottom edge - BottomTabs (in AppShell) handles bottom safe area
  // Only apply safe area to left/right edges
  const safeAreaEdges: ("top" | "bottom" | "left" | "right")[] = [
    "left",
    "right",
  ];

  // Calculate bottom padding to account for tab bar (when tabs are visible)
  // This ensures content doesn't get hidden behind the tabs
  // TAB_BAR_HEIGHT is a constant (56px), we add safe area bottom inset
  const tabBarHeight = TAB_BAR_HEIGHT + insets.bottom;
  const defaultBottomPadding = scroll ? tabBarHeight : 0;

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
              padding: theme.spacing.md,
              paddingBottom: defaultBottomPadding + theme.spacing.md,
            },
            contentContainerStyle,
          ]}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={safeAreaEdges}
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: theme.spacing.md,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </SafeAreaView>
  );
}
