// components/ui/Button.tsx
// Consistent button component.
// - Uses Pressable
// - Supports primary, secondary, danger variants
// - Consistent padding, radius, alignment

import React from "react";
import { Pressable, StyleSheet, PressableProps } from "react-native";
import { colors, spacing, radius } from "@/theme";
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
  const variantStyle =
    variant === "primary"
      ? styles.primary
      : variant === "secondary"
        ? styles.secondary
        : styles.danger;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        variantStyle,
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
      disabled={disabled}
      {...pressableProps}
    >
      <AppText
        variant="body"
        style={[
          styles.buttonText,
          variant === "primary" || variant === "danger"
            ? styles.buttonTextPrimary
            : styles.buttonTextSecondary,
        ]}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
  },
  buttonText: {
    fontWeight: "600",
  },
  buttonTextPrimary: {
    color: colors.primaryText,
  },
  buttonTextSecondary: {
    color: colors.textPrimary,
  },
});

