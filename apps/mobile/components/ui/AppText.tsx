// components/ui/AppText.tsx
// Consistent typography component.
// - Maps to theme typography variants
// - Maps to theme colors

import React, { useMemo } from "react";
import { Text, TextProps } from "react-native";
import { useTheme } from "@/lib/theme";

type TypographyVariant =
  | "display"
  | "title"
  | "headline"
  | "subtitle"
  | "body"
  | "label"
  | "caption"
  | "overline";
type TextColor =
  | "primary"
  | "secondary"
  | "danger"
  | "onPrimary"
  | "success"
  | "warning";

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

  const baseStyle = useMemo(() => {
    const colorMap: Record<TextColor, string> = {
      primary: theme.colors.textPrimary,
      secondary: theme.colors.textSecondary,
      danger: theme.colors.danger,
      onPrimary: theme.colors.primaryText,
      success: theme.colors.success,
      warning: theme.colors.warning,
    };
    return {
      ...theme.typography[variant],
      color: colorMap[color],
    };
  }, [theme, variant, color]);

  return <Text style={[baseStyle, style]} {...props} />;
}
