// components/ui/Button.tsx
// Game-like button component with 3D effects.
// - Uses Pressable with haptic feedback
// - Supports primary, secondary, danger variants
// - 3D border effect and shadow

import React from "react";
import { Pressable, PressableProps, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
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
  onPress,
  ...pressableProps
}: ButtonProps) {
  const { theme } = useTheme();

  const handlePress = (e: any) => {
    if (!disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress?.(e);
  };

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

  // Determine border color based on variant
  const getBorderColor = () => {
    if (disabled) {
      return theme.colors.border;
    }
    if (variant === "primary") {
      return "transparent";
    }
    if (variant === "secondary") {
      return theme.colors.border;
    }
    return "transparent";
  };

  // Determine bottom border color (darker for 3D effect)
  const getBottomBorderColor = () => {
    if (disabled) {
      return theme.colors.textSecondary + "40";
    }
    if (variant === "primary") {
      // Dark overlay for 3D effect
      return "rgba(0,0,0,0.25)";
    }
    if (variant === "secondary") {
      return theme.colors.textSecondary + "50";
    }
    // danger
    return "rgba(0,0,0,0.25)";
  };

  // Determine shadow color
  const getShadowColor = () => {
    if (disabled) {
      return "#000";
    }
    if (variant === "primary") {
      return theme.colors.primary;
    }
    if (variant === "danger") {
      return theme.colors.danger;
    }
    return "#000";
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
        const pressed = pressableState.pressed && !disabled;
        const baseStyle = {
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.lg,
          borderRadius: 14,
          alignItems: "center" as const,
          justifyContent: "center" as const,
          minHeight: 48,
          backgroundColor: getBackgroundColor(),
          borderWidth: 1,
          borderBottomWidth: pressed ? 1 : 3,
          borderColor: getBorderColor(),
          borderBottomColor: getBottomBorderColor(),
          shadowColor: getShadowColor(),
          shadowOffset: { width: 0, height: pressed ? 1 : 3 },
          shadowOpacity: disabled ? 0 : pressed ? 0.1 : 0.25,
          shadowRadius: pressed ? 2 : 4,
          elevation: disabled ? 0 : pressed ? 2 : 4,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          marginTop: pressed ? 2 : 0,
        };

        const customStyle =
          typeof style === "function" ? style(pressableState) : style;
        return [baseStyle, customStyle].filter(Boolean);
      }}
      disabled={disabled}
      onPress={handlePress}
      {...pressableProps}
    >
      <AppText
        variant="body"
        style={[
          {
            fontWeight: "700",
            color: getTextColor(),
            letterSpacing: 0.3,
          },
        ]}
      >
        {label}
      </AppText>
    </Pressable>
  );
}
