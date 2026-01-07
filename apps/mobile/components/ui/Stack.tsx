// components/ui/Stack.tsx
// Vertical stack primitive with consistent gaps.
// - Standardized spacing

import React from "react";
import { View, ViewProps, StyleSheet } from "react-native";
import { spacing } from "@/theme";

interface StackProps extends ViewProps {
  children: React.ReactNode;
  gap?: number;
}

export function Stack({ children, style, gap, ...props }: StackProps) {
  return (
    <View
      style={[
        styles.stack,
        gap !== undefined && { gap },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    flexDirection: "column",
  },
});

