// features/groups/group-lobby/components/LobbyCardSkeleton.tsx
// Shared skeleton with pulse animation for lobby cards (ranking, chat, etc.).

import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/lib/theme";

interface LobbyCardSkeletonProps {
  height?: number;
}

export function LobbyCardSkeleton({ height = 80 }: LobbyCardSkeletonProps) {
  const { theme } = useTheme();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { backgroundColor: theme.colors.border, height },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    borderRadius: 12,
    marginBottom: 16,
    // marginHorizontal: 16,
  },
});
