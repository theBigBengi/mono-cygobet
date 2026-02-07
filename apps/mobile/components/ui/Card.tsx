// components/ui/Card.tsx
// Consistent card component for list items and grouped content.
// - Uses theme colors and spacing
// - Consistent border and padding

import React from "react";
import { View, ViewProps, StyleSheet } from "react-native";
import { useTheme } from "@/lib/theme";

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, style, ...props }: CardProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderWidth: 1,
          borderRadius: theme.radius.md,
          padding: theme.spacing.md,
          marginBottom: theme.spacing.sm,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
