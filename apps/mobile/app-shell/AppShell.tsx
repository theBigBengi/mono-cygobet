// src/app-shell/AppShell.tsx
// App shell component that owns:
// - SafeArea handling (wraps AppBar in SafeAreaView)
// - StatusBar policy (declared once, globally)
// - AppBar mounting
// - Modal route detection and AppBar visibility policy
//
// This component wraps the routed content and provides the app-level shell infrastructure.

import React, { useEffect, useRef } from "react";
import { View } from "react-native";
import { useSegments, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme";
import { AppBarProvider } from "./appbar/AppBarProvider";
import { AppBar } from "./appbar/AppBar";
import {
  useAppBarSetters,
  useAppBarConfigInternal,
} from "./appbar/appBar.store";
import { getAppBarPresetStyles } from "./appbar/appBar.presets";
import { shouldHideShellUI } from "./appbar/appBar.utils";
import { TabsProvider, BottomTabs, useTabNavigation } from "./tabs";
import { useTabsStore } from "./tabs/tabs.store";
import { getTabConfig } from "./tabs/tabs.config";
import type { ReactNode } from "react";
import type { TabId } from "./tabs/tabs.types";

interface AppShellProps {
  children: ReactNode;
}

/**
 * AppShellContent - Internal component that handles route detection and shell UI visibility.
 * Must be inside AppBarProvider and TabsProvider to access stores.
 */
function AppShellContent({ children }: AppShellProps) {
  const { mergeAppBar, setAppBar } = useAppBarSetters();
  const { state: tabsState } = useTabsStore();
  const config = useAppBarConfigInternal();
  const segments = useSegments();
  const pathname = usePathname();
  const { colorScheme, theme } = useTheme();
  const shouldHide = shouldHideShellUI(segments, pathname);
  const previousActiveTabRef = useRef<TabId | null>(null);

  // Track route changes to update tab navigation history
  useTabNavigation();

  // Hide AppBar and Tabs for auth/onboarding/modal routes
  useEffect(() => {
    if (shouldHide) {
      mergeAppBar({ visible: false });
    }
  }, [shouldHide, mergeAppBar]);

  // Reset AppBar ONLY when tab actually changes (not on internal navigation)
  useEffect(() => {
    if (shouldHide) {
      return; // Don't reset AppBar if shell UI is hidden
    }

    const currentTab = tabsState.activeTab;
    const previousTab = previousActiveTabRef.current;

    // Only reset AppBar if tab actually changed (not initial mount)
    if (previousTab !== null && previousTab !== currentTab) {
      const tabConfig = getTabConfig(currentTab);
      setAppBar({
        visible: tabConfig.defaultAppBarVisible,
        variant: tabConfig.defaultAppBarVariant,
        slots: {},
      });
    }

    // Update ref for next comparison
    previousActiveTabRef.current = currentTab;
  }, [tabsState.activeTab, setAppBar, shouldHide]);

  // Get AppBar background color to match SafeAreaView background
  const presetStyles = getAppBarPresetStyles(config.variant, theme);
  const appBarBackgroundColor =
    config.styleOverrides?.backgroundColor ??
    (presetStyles.container.backgroundColor as string | undefined) ??
    theme.colors.surface;

  return (
    <>
      {/* AppBar wrapped in SafeAreaView to respect iOS notch/dynamic island */}
      {/* Only top edge needs safe area - AppBar should start below status bar */}
      {/* SafeAreaView background matches AppBar to prevent visual gap */}
      {!shouldHide && (
        <SafeAreaView
          edges={["top"]}
          style={{ backgroundColor: appBarBackgroundColor }}
        >
          <AppBar />
        </SafeAreaView>
      )}
      {/* Content area between AppBar and Bottom Tabs */}
      <View style={{ flex: 1 }}>{children}</View>
      {/* Bottom Tabs - only show in main app area */}
      {!shouldHide && <BottomTabs />}
      {/* StatusBar declared once, globally - controlled by theme */}
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
    </>
  );
}

/**
 * AppShell component.
 * Provides app-level shell infrastructure:
 * - AppBar context and mounting (wrapped in SafeAreaView)
 * - Bottom Tabs mounting and state management
 * - SafeArea handling (enforced at shell level, not per-screen)
 * - StatusBar control (declared once, globally)
 * - Route detection (auth/onboarding/modal) to hide shell UI
 * - Tab change handling and AppBar reset
 *
 * SHELL UI VISIBILITY:
 * - AppBar and Tabs are hidden for: auth, onboarding, modal routes
 * - Both are shown in main app area (protected routes)
 *
 * TAB BEHAVIOR:
 * - Each tab maintains its own navigation stack
 * - Switching tabs resets AppBar to tab's default preset
 * - Tabs fade out when keyboard opens, fade back when keyboard closes
 *
 * SAFE AREA POLICY:
 * - AppBar is wrapped in SafeAreaView with edges={["top"]}
 * - This ensures AppBar always starts below iOS status bar/notch/dynamic island
 * - No hardcoded padding - uses system safe-area insets
 * - Works on devices with and without notch
 *
 * Usage in app/_layout.tsx:
 * ```tsx
 * <AppShell>
 *   <Stack>...</Stack>
 * </AppShell>
 * ```
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <AppBarProvider>
      <TabsProvider>
        <AppShellContent>{children}</AppShellContent>
      </TabsProvider>
    </AppBarProvider>
  );
}
