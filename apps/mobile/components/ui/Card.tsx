// components/ui/Card.tsx
// Consistent card component for list items and grouped content.
// - Uses theme colors and spacing
// - Consistent border and padding

import React from "react";
import { View, ViewProps, StyleSheet } from "react-native";
import { colors, spacing, radius } from "@/theme";

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, style, ...props }: CardProps) {
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
});

