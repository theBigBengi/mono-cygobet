// components/ui/AnimatedStickyHeader.tsx
// Animated sticky header component that can overlay any scrollable content.
// - Fades in background and title based on scroll position
// - Back button and customizable right actions
// - Use with useSharedValue for scroll tracking
//
// Usage:
// 1. Create scrollY = useSharedValue(0)
// 2. Track scroll in your ScrollView: onScroll={(e) => scrollY.value = e.nativeEvent.contentOffset.y}
// 3. Render <AnimatedStickyHeader scrollY={scrollY} ... /> at root level

import React from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Text,
} from "react-native";
import Animated, {
  SharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme";
import { useGoBack } from "@/hooks/useGoBack";

const DEFAULT_THRESHOLD = 100;
const DEFAULT_HEIGHT = 52;

export interface HeaderAction {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: number;
}

export interface AnimatedStickyHeaderProps {
  /** Animated scroll Y value from reanimated useSharedValue */
  scrollY: SharedValue<number>;
  /** Title shown when scrolled past threshold */
  title: string;
  /** Fallback route for back button when no history exists */
  fallbackRoute?: string;
  /** Tint color for header background effect (defaults to primary) */
  tintColor?: string;
  /** Right side action buttons */
  rightActions?: HeaderAction[];
  /** Scroll threshold before header background appears (default: 100) */
  threshold?: number;
  /** Header height (default: 52) */
  height?: number;
  /** When true, hides the back button */
  hideBackButton?: boolean;
  /** Custom onBack handler (overrides default goBack) */
  onBack?: () => void;
  /** When true, parent extends into status bar with negative margin - requires extra offset */
  extendsIntoStatusBar?: boolean;
  /** When true, icons have no background circle */
  transparentIcons?: boolean;
}

export function AnimatedStickyHeader({
  scrollY,
  title,
  fallbackRoute = "/(tabs)/home",
  tintColor,
  rightActions = [],
  threshold = DEFAULT_THRESHOLD,
  height = DEFAULT_HEIGHT,
  hideBackButton = false,
  onBack,
  extendsIntoStatusBar = false,
  transparentIcons = false,
}: AnimatedStickyHeaderProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const defaultGoBack = useGoBack(fallbackRoute);
  const goBack = onBack ?? defaultGoBack;
  const headerTint = tintColor ?? theme.colors.primary;

  // When parent extends into status bar, we need extra offset to compensate
  const topOffset = extendsIntoStatusBar ? insets.top * 2 : insets.top;
  const totalHeight = extendsIntoStatusBar ? insets.top * 2 + height : insets.top + height;

  // Animated styles - background fades in on scroll (smooth transition)
  const bgStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [threshold - 40, threshold],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  // Animated styles - title fades in on scroll (smooth transition)
  const titleStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [threshold - 40, threshold],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  return (
    <View style={[styles.container, { height: totalHeight }]}>
      {/* Background layer - fades in on scroll */}
      <Animated.View
        style={[
          styles.backgroundLayer,
          { backgroundColor: theme.colors.background },
          bgStyle,
        ]}
      />
      {/* Tint layer - fades in on scroll */}
      <Animated.View
        style={[
          styles.tintLayer,
          { backgroundColor: headerTint },
          bgStyle,
        ]}
      />

      {/* Content below status bar */}
      <View style={[styles.content, { height, marginTop: topOffset }]}>
          {/* Back button */}
          {!hideBackButton && (
            <Pressable
              onPress={goBack}
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.iconCircle,
                  !transparentIcons && { backgroundColor: theme.colors.surface },
                ]}
              >
                <Ionicons
                  name="chevron-back"
                  size={22}
                  color={theme.colors.textPrimary}
                />
              </View>
            </Pressable>
          )}

          {/* Title - appears on scroll */}
          <Animated.View style={[styles.titleContainer, titleStyle]}>
            <Text
              style={[styles.title, { color: theme.colors.textPrimary }]}
              numberOfLines={1}
            >
              {title}
            </Text>
          </Animated.View>

          {/* Right actions */}
          <View style={styles.rightActions}>
            {rightActions.map((action, index) => (
              <Pressable
                key={index}
                onPress={action.onPress}
                style={({ pressed }) => [pressed && styles.pressed]}
              >
                <View
                  style={[
                    styles.iconCircle,
                    !transparentIcons && { backgroundColor: theme.colors.surface },
                  ]}
                >
                  <Ionicons
                    name={action.icon}
                    size={action.size ?? 20}
                    color={theme.colors.textPrimary}
                  />
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  tintLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  iconButton: {
    zIndex: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  rightActions: {
    flexDirection: "row",
    gap: 8,
  },
  pressed: {
    opacity: 0.6,
  },
});
