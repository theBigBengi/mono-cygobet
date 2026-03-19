// components/ui/Card.tsx
// Modern card component — shadow-based depth, no borders.
// - Uses theme colors, spacing, radius, and shadows
// - Clean floating card on background

import React from "react";
import { View, ViewProps } from "react-native";
import { useTheme } from "@/lib/theme";
import { getShadowStyle } from "@/lib/theme/shadows";

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
          borderRadius: theme.radius.lg,
          padding: theme.spacing.md,
          ...getShadowStyle("sm"),
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
