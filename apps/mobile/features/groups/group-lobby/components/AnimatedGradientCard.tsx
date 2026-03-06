// AnimatedGradientCard.tsx
// Animated gradient background using two stacked LinearGradient layers
// that cycle through colors with RN Animated interpolation.

import React, { useEffect, useRef } from "react";
import { Animated as RNAnimated, StyleSheet, type ViewProps } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const COLORS = [
  "#9CA3AF08",  // gray
  "#6366F10A",  // purple
  "#9CA3AF08",  // gray
  "#EC48990A",  // pink
  "#9CA3AF08",  // gray
];

const DURATION = 4000;

const AnimatedGradient = RNAnimated.createAnimatedComponent(LinearGradient);

interface AnimatedGradientCardProps extends ViewProps {
  children: React.ReactNode;
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

  return (
    <AnimatedGradient
      colors={[color0, color1] as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, style]}
      {...rest}
    >
      {children}
    </AnimatedGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    borderRadius: 12,
    backgroundColor: "#9CA3AF10",
  },
});
