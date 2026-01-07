// components/ui/Button.tsx
// Consistent button component.
// - Uses Pressable
// - Supports primary, secondary, danger variants
// - Consistent padding, radius, alignment

import React from "react";
import { Pressable, StyleSheet, PressableProps } from "react-native";
import { useTheme } from "@/lib/theme";
import { AppText } from "./AppText";

type ButtonVariant = "primary" | "secondary" | "danger";

interface ButtonProps extends Omit<PressableProps, "style"> {
  label: string;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: PressableProps["style"];
}

export function Button({
  label,
  variant = "primary",
  disabled = false,
  style,
  ...pressableProps
}: ButtonProps) {
  const { theme } = useTheme();

  const variantStyle =
    variant === "primary"
      ? { backgroundColor: theme.colors.primary }
      : variant === "secondary"
        ? {
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }
        : { backgroundColor: theme.colors.danger };

  const buttonTextColor =
    variant === "primary" || variant === "danger"
      ? theme.colors.primaryText
      : theme.colors.textPrimary;

  return (
    <Pressable
      style={({ pressed }) => [
        {
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.lg,
          borderRadius: theme.radius.sm,
          alignItems: "center",
          justifyContent: "center",
          minHeight: 44,
          ...variantStyle,
          ...(disabled && { opacity: 0.5 }),
          ...(pressed && { opacity: 0.8 }),
        },
        style,
      ]}
      disabled={disabled}
      {...pressableProps}
    >
      <AppText
        variant="body"
        style={[
          {
            fontWeight: "600",
            color: buttonTextColor,
          },
        ]}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

