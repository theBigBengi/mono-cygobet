// components/ui/Row.tsx
// Horizontal row primitive with consistent spacing.
// - Align center, justify between
// - Standardized spacing

import React from "react";
import { View, ViewProps, StyleSheet } from "react-native";

interface RowProps extends ViewProps {
  children: React.ReactNode;
  gap?: number;
}

export function Row({ children, style, gap, ...props }: RowProps) {
  return (
    <View style={[styles.row, gap !== undefined && { gap }, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
