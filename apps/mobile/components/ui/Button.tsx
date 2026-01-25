// components/ui/Button.tsx
// Consistent button component.
// - Uses Pressable
// - Supports primary, secondary, danger variants
// - Consistent padding, radius, alignment

import React from "react";
import { Pressable, PressableProps } from "react-native";
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

  // Determine background color based on variant and disabled state
  const getBackgroundColor = () => {
    if (disabled) {
      return theme.colors.surface;
    }
    if (variant === "primary") {
      return theme.colors.primary;
    }
    if (variant === "secondary") {
      return theme.colors.surface;
    }
    return theme.colors.danger;
  };

  // Determine border style based on variant and disabled state
  const getBorderStyle = () => {
    if (disabled || variant === "secondary") {
      return {
        borderWidth: 1,
        borderColor: theme.colors.border,
      };
    }
    return {};
  };

  // Determine text color based on variant and disabled state
  const getTextColor = () => {
    if (disabled) {
      return theme.colors.textSecondary;
    }
    if (variant === "primary" || variant === "danger") {
      return theme.colors.primaryText;
    }
    return theme.colors.textPrimary;
  };

  return (
    <Pressable
      style={(pressableState) => {
        const baseStyle = {
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.lg,
          borderRadius: theme.radius.sm,
          alignItems: "center" as const,
          justifyContent: "center" as const,
          minHeight: 44,
          backgroundColor: getBackgroundColor(),
          ...getBorderStyle(),
          ...(pressableState.pressed && !disabled && { opacity: 0.8 }),
        };

        const customStyle =
          typeof style === "function" ? style(pressableState) : style;
        return [baseStyle, customStyle].filter(Boolean);
      }}
      disabled={disabled}
      {...pressableProps}
    >
      <AppText
        variant="body"
        style={[
          {
            fontWeight: "600",
            color: getTextColor(),
          },
        ]}
      >
        {label}
      </AppText>
    </Pressable>
  );
}
