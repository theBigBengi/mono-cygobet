// src/app-shell/appbar/AppBar.tsx
// Render-only AppBar component.
// Receives config from context and renders accordingly.
// No business logic, only presentation.
//
// Layout Strategy: Overlay Center
// - Center slot is absolutely positioned overlay, always centered to screen
// - Left/right slots are in normal flow, don't affect center positioning
// - Center has reserved side width padding to avoid overlapping hit areas
// - Center content is truncated by default to prevent layout overflow

import React from "react";
import { View, StyleSheet, ViewStyle, Text } from "react-native";
import { Row, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useAppBarConfigInternal } from "./appBar.store";
import { getAppBarPresetStyles } from "./appBar.presets";
import { mergeStyleOverrides } from "./appBar.utils";
import { RESERVED_SIDE_WIDTH } from "./AppBar.constants";

/**
 * AppBar component.
 * Renders the persistent app bar based on configuration from context.
 * This component is mounted once in the app shell and controlled by screens via the store.
 *
 * Layout:
 * - Container: relative positioning
 * - Left/Right slots: normal flow, positioned at edges
 * - Center slot: absolute overlay, centered to screen, with reserved side padding
 */
export function AppBar() {
  const config = useAppBarConfigInternal();
  const { theme } = useTheme();
  const presetStyles = getAppBarPresetStyles(config.variant, theme);

  if (!config.visible) {
    return null;
  }

  // Merge preset styles with overrides
  const containerStyle: ViewStyle = mergeStyleOverrides(
    presetStyles.container,
    config.styleOverrides
  );

  // AppBar height: barHeightPreset only (safe area is handled by SafeAreaView wrapper in AppShell)
  // The SafeAreaView wrapper ensures AppBar starts below status bar/notch
  const barHeight = config.styleOverrides?.height ?? presetStyles.height;

  return (
    <View
      style={[
        styles.container,
        containerStyle,
        {
          height: barHeight,
          minHeight: barHeight,
        },
      ]}
    >
      {/* Left/Right slots layer (normal flow) */}
      <Row
        style={[
          styles.sideSlotsRow,
          { paddingHorizontal: presetStyles.padding.horizontal },
        ]}
      >
        {/* Left Slot */}
        <View style={styles.slotLeft}>{config.slots.left}</View>

        {/* Spacer to push right slot to the right */}
        <View style={styles.spacer} />

        {/* Right Slot */}
        <View style={styles.slotRight}>{config.slots.right}</View>
      </Row>

      {/* Center slot overlay (absolutely positioned, always centered) */}
      {config.slots.center && (
        <View
          style={[
            styles.centerOverlay,
            {
              paddingLeft: RESERVED_SIDE_WIDTH,
              paddingRight: RESERVED_SIDE_WIDTH,
            },
          ]}
          pointerEvents="box-none"
        >
          <CenterContentWrapper>{config.slots.center}</CenterContentWrapper>
        </View>
      )}
    </View>
  );
}

/**
 * CenterContentWrapper component.
 * Wraps center slot content to enforce truncation by default.
 *
 * TOUCH SAFETY:
 * - This wrapper has pointerEvents="auto" to allow interaction with center content.
 * - The parent overlay has pointerEvents="box-none" to pass touches through to side buttons.
 * - This ensures: side buttons are clickable, center interactive elements work.
 *
 * TRUNCATION POLICY:
 * - All center content is truncated by default to prevent layout overflow.
 * - Text/AppText elements get numberOfLines={1} and ellipsizeMode="tail".
 * - Other content is clamped with maxWidth and overflow: "hidden".
 */
function CenterContentWrapper({ children }: { children: React.ReactNode }) {
  // Clone children to add truncation props to Text/AppText elements
  const truncatedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      const childType = child.type;

      // Check if it's a Text component
      if (childType === Text) {
        return React.cloneElement(child as React.ReactElement<any>, {
          numberOfLines: 1,
          ellipsizeMode: "tail",
          style: [{ textAlign: "center" }, (child.props as any).style],
        });
      }

      // Check if it's AppText component
      if (childType === AppText) {
        return React.cloneElement(child as React.ReactElement<any>, {
          numberOfLines: 1,
          ellipsizeMode: "tail",
          style: [{ textAlign: "center" }, (child.props as any).style],
        });
      }

      // For other components (e.g., Pressable, custom components), wrap in a container
      // that enforces truncation
      return <View style={styles.centerContentClamp}>{child}</View>;
    }
    return child;
  });

  return (
    <View style={styles.centerContent} pointerEvents="auto">
      {truncatedChildren}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    justifyContent: "center",
    zIndex: 1000,
    position: "relative",
  },
  sideSlotsRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    minHeight: 56,
  },
  slotLeft: {
    alignItems: "flex-start",
    justifyContent: "center",
    minHeight: 44,
  },
  spacer: {
    flex: 1,
  },
  slotRight: {
    alignItems: "flex-end",
    justifyContent: "center",
    minHeight: 44,
  },
  centerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    // pointerEvents: "box-none" allows touches to pass through to buttons below
  },
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    // Ensure content doesn't overflow
    overflow: "hidden",
  },
  centerContentClamp: {
    maxWidth: "100%",
    overflow: "hidden",
  },
});
