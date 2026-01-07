// components/ui/AppText.tsx
// Consistent typography component.
// - Maps to theme typography variants
// - Maps to theme colors

import React from "react";
import { Text, TextProps, StyleSheet } from "react-native";
import { useTheme } from "@/lib/theme";

type TypographyVariant = "title" | "subtitle" | "body" | "caption";
type TextColor = "primary" | "secondary" | "danger";

interface AppTextProps extends Omit<TextProps, "style"> {
  variant?: TypographyVariant;
  color?: TextColor;
  style?: TextProps["style"];
}

export function AppText({
  variant = "body",
  color = "primary",
  style,
  ...props
}: AppTextProps) {
  const { theme } = useTheme();
  const variantStyle = theme.typography[variant];
  const colorValue =
    color === "primary"
      ? theme.colors.textPrimary
      : color === "secondary"
        ? theme.colors.textSecondary
        : theme.colors.danger;

  return (
    <Text
      style={[
        {
          fontSize: variantStyle.fontSize,
          fontWeight: variantStyle.fontWeight,
          lineHeight: variantStyle.lineHeight,
          color: colorValue,
        },
        style,
      ]}
      {...props}
    />
  );
}

