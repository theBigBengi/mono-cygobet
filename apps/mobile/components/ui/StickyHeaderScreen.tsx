// components/ui/StickyHeaderScreen.tsx
// Reusable screen wrapper with Spotify-style sticky header.
// - Header appears on scroll with animated title
// - Supports custom tint color for gradient effect
// - Back button and customizable right actions
// - Pull-to-refresh support

import React, { useCallback, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  RefreshControl,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ViewStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  useAnimatedScrollHandler,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme";
import { useGoBack } from "@/hooks/useGoBack";

const STICKY_HEADER_THRESHOLD = 100;

export interface StickyHeaderAction {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: number;
}

export interface StickyHeaderScreenProps {
  children: React.ReactNode;
  /** Title shown in sticky header when scrolled */
  title: string;
  /** Fallback route for back button when no history exists */
  fallbackRoute?: string;
  /** Tint color for header gradient effect (defaults to primary) */
  tintColor?: string;
  /** Right side action buttons */
  rightActions?: StickyHeaderAction[];
  /** Optional pull-to-refresh handler */
  onRefresh?: () => void | Promise<void>;
  /** Optional scroll event callback (receives scroll Y position) */
  onScroll?: (scrollY: number) => void;
  /** Content container style */
  contentContainerStyle?: ViewStyle;
  /** When true, hides the back button */
  hideBackButton?: boolean;
}

export function StickyHeaderScreen({
  children,
  title,
  fallbackRoute = "/(tabs)/home",
  tintColor,
  rightActions = [],
  onRefresh,
  onScroll,
  contentContainerStyle,
  hideBackButton = false,
}: StickyHeaderScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const goBack = useGoBack(fallbackRoute);
  const [refreshing, setRefreshing] = useState(false);

  const scrollY = useSharedValue(0);
  const headerTint = tintColor ?? theme.colors.primary;

  // Animated scroll handler
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Native scroll handler for callback
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      onScroll?.(event.nativeEvent.contentOffset.y);
    },
    [onScroll]
  );

  // Animated styles for sticky header
  const stickyBgStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [STICKY_HEADER_THRESHOLD - 30, STICKY_HEADER_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const stickyTitleStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [STICKY_HEADER_THRESHOLD - 30, STICKY_HEADER_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await Promise.resolve(onRefresh());
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const refreshControl = onRefresh ? (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      tintColor={theme.colors.primary}
      colors={Platform.OS === "android" ? [theme.colors.primary] : undefined}
    />
  ) : undefined;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Scrollable content */}
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 80 },
          contentContainerStyle,
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => {
          // Call both handlers
          scrollHandler(event as any);
          handleScroll(event);
        }}
        scrollEventThrottle={16}
        refreshControl={refreshControl}
      >
        {children}
      </Animated.ScrollView>

      {/* Sticky header - positioned absolutely at top */}
      <View style={[styles.stickyHeader, { paddingTop: 0 }]}>
        {/* Background layer - fades in on scroll */}
        <Animated.View
          style={[
            styles.stickyHeaderBg,
            { backgroundColor: theme.colors.background },
            stickyBgStyle,
          ]}
        />
        {/* Tint layer - fades in on scroll */}
        <Animated.View
          style={[
            styles.stickyHeaderTint,
            { backgroundColor: headerTint + "15" },
            stickyBgStyle,
          ]}
        />

        {/* Header content */}
        <View style={styles.stickyHeaderContent}>
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
                  { backgroundColor: theme.colors.surface },
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
          <Animated.View style={[styles.titleContainer, stickyTitleStyle]}>
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
                    { backgroundColor: theme.colors.surface },
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  // Sticky header styles
  stickyHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 52,
    zIndex: 50,
  },
  stickyHeaderBg: {
    ...StyleSheet.absoluteFillObject,
  },
  stickyHeaderTint: {
    ...StyleSheet.absoluteFillObject,
  },
  stickyHeaderContent: {
    flex: 1,
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
