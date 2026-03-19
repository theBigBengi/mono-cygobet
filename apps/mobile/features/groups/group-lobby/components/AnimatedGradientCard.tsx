// AnimatedGradientCard.tsx
// Animated gradient background using two stacked LinearGradient layers
// that cycle through colors with RN Animated interpolation.

import React, { useEffect, useRef } from "react";
import { Animated as RNAnimated, View, StyleSheet, type ViewProps } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const COLORS = [
  "#9CA3AF0A",  // gray
  "#0A84FF20",  // blue
  "#9CA3AF0A",  // gray
  "#34C75920",  // green
  "#9CA3AF0A",  // gray
];

const BORDER_COLORS = [
  "#9CA3AF18",  // gray
  "#0A84FF40",  // blue
  "#9CA3AF18",  // gray
  "#34C75940",  // green
  "#9CA3AF18",  // gray
];

const ICON_COLORS = [
  "#9CA3AF",    // gray
  "#0A84FF",    // blue
  "#9CA3AF",    // gray
  "#34C759",    // green
  "#9CA3AF",    // gray
];

const ICON_BG_COLORS = [
  "#9CA3AF0A",  // gray
  "#0A84FF18",  // blue
  "#9CA3AF0A",  // gray
  "#34C75918",  // green
  "#9CA3AF0A",  // gray
];

const DURATION = 4000;

const AnimatedGradient = RNAnimated.createAnimatedComponent(LinearGradient);

interface AnimatedGradientCardProps extends ViewProps {
  children: React.ReactNode | ((iconColor: RNAnimated.AnimatedInterpolation<string>, iconBgColor: RNAnimated.AnimatedInterpolation<string>) => React.ReactNode);
}

export function AnimatedGradientCard({ children, style, ...rest }: AnimatedGradientCardProps) {
  const anim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const loop = () => {
      anim.setValue(0);
      RNAnimated.timing(anim, {
        toValue: COLORS.length - 1,
        duration: DURATION * (COLORS.length - 1),
        useNativeDriver: false,
      }).start(() => loop());
    };
    loop();
  }, [anim]);

  const inputRange = COLORS.map((_, i) => i);

  const color0 = anim.interpolate({
    inputRange,
    outputRange: COLORS,
  });

  // Offset by 2 positions, but keep it cyclical (start & end same color)
  const cycle = COLORS.slice(0, -1); // remove closing duplicate
  const rotated = [...cycle.slice(2), ...cycle.slice(0, 2)];
  const color1 = anim.interpolate({
    inputRange,
    outputRange: [...rotated, rotated[0]], // close the loop
  });

  const borderColor = anim.interpolate({
    inputRange,
    outputRange: BORDER_COLORS,
  });

  const iconColor = anim.interpolate({
    inputRange,
    outputRange: ICON_COLORS,
  });

  const iconBgColor = anim.interpolate({
    inputRange,
    outputRange: ICON_BG_COLORS,
  });

  return (
    <View style={[styles.container, style]} {...rest}>
      {typeof children === "function" ? children(iconColor, iconBgColor) : children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
  },
});
