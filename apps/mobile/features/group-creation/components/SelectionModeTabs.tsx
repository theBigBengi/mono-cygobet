// features/group-creation/components/SelectionModeTabs.tsx
// 3-way mode selector for group creation: Upcoming games | Leagues | Teams.
// Modern segmented control design with blur effect and smooth animations.
// English only. Uses theme colors, spacing, radius.

import React, { useEffect, useRef } from "react";
import { View, Pressable, StyleSheet, Animated, LayoutChangeEvent } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "@/lib/theme";
import { AppText } from "@/components/ui";

export type SelectionMode = "fixtures" | "leagues" | "teams";

const MODES: { value: SelectionMode; label: string }[] = [
  { value: "fixtures", label: "Games" },
  { value: "leagues", label: "Leagues" },
  { value: "teams", label: "Teams" },
];

interface SelectionModeTabsProps {
  value: SelectionMode;
  onChange: (mode: SelectionMode) => void;
}

export function SelectionModeTabs({ value, onChange }: SelectionModeTabsProps) {
  const { theme, colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const indicatorPosition = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;
  const tabLayouts = useRef<{ [key: string]: { x: number; width: number } }>({});
  const containerWidth = useRef(0);

  const currentIndex = MODES.findIndex((m) => m.value === value);

  const handleTabLayout = (mode: SelectionMode, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    tabLayouts.current[mode] = { x, width };
    
    if (mode === value) {
      indicatorPosition.setValue(x);
      indicatorWidth.setValue(width);
    }
  };

  const handleContainerLayout = (event: LayoutChangeEvent) => {
    containerWidth.current = event.nativeEvent.layout.width;
  };

  useEffect(() => {
    const layout = tabLayouts.current[value];
    if (layout) {
      Animated.parallel([
        Animated.spring(indicatorPosition, {
          toValue: layout.x,
          useNativeDriver: false,
          tension: 68,
          friction: 8,
        }),
        Animated.spring(indicatorWidth, {
          toValue: layout.width,
          useNativeDriver: false,
          tension: 68,
          friction: 8,
        }),
      ]).start();
    }
  }, [value, indicatorPosition, indicatorWidth]);

  return (
    <View style={styles.wrapper}>
      <View
        onLayout={handleContainerLayout}
        style={[
          styles.container,
          {
            // borderRadius: 99,
            borderColor: theme.colors.border,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          },
        ]}
      >
        <BlurView
          intensity={80}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.content}>
          <Animated.View
            style={[
              styles.indicator,
              {
                backgroundColor: theme.colors.primary,
                left: indicatorPosition,
                width: indicatorWidth,
                borderRadius: 99,
              },
            ]}
          />
          {MODES.map((m) => {
            const isSelected = value === m.value;
            return (
              <Pressable
                key={m.value}
                onLayout={(e) => handleTabLayout(m.value, e)}
                onPress={() => onChange(m.value)}
                style={({ pressed }) => [
                  styles.tab,
                  {
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <AppText
                  variant="body"
                  style={[
                    styles.tabText,
                    {
                      color: isSelected
                        ? theme.colors.primaryText
                        : theme.colors.textPrimary,
                      fontWeight: isSelected ? "700" : "500",
                    },
                  ]}
                >
                  {m.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  container: {
    overflow: "hidden",
    borderWidth: 1,
    minHeight: 48,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    padding: 4,
  },
  indicator: {
    position: "absolute",
    height: "100%",
    top: 4,
    bottom: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    zIndex: 1,
  },
  tabText: {
    fontSize: 14,
    letterSpacing: 0.2,
  },
});
