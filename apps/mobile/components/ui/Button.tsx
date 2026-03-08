// components/ui/Button.tsx
// Game-like button component with 3D effects.
// - Uses Pressable with haptic feedback
// - Supports primary, secondary, danger variants
// - 3D border effect and shadow

import React, { useMemo } from "react";
import { Pressable, PressableProps, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/lib/theme";
import { AppText } from "./AppText";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

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

  const handlePress = (e: import("react-native").GestureResponderEvent) => {
    if (!disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress?.(e);
  };

  const colors = useMemo(() => {
    const isGhost = variant === "ghost";
    let bg: string, border: string, bottomBorder: string, shadow: string, text: string;

    if (disabled) {
      bg = theme.colors.surface;
      border = theme.colors.border;
      bottomBorder = theme.colors.textSecondary + "40";
      shadow = "transparent";
      text = theme.colors.textSecondary;
    } else if (isGhost) {
      bg = "transparent";
      border = "transparent";
      bottomBorder = "transparent";
      shadow = "transparent";
      text = theme.colors.textSecondary;
    } else if (variant === "primary") {
      bg = theme.colors.primary;
      border = "transparent";
      bottomBorder = theme.colors.textPrimary + "40";
      shadow = theme.colors.primary;
      text = theme.colors.primaryText;
    } else if (variant === "danger") {
      bg = theme.colors.danger;
      border = "transparent";
      bottomBorder = theme.colors.textPrimary + "40";
      shadow = theme.colors.danger;
      text = theme.colors.primaryText;
    } else {
      // secondary
      bg = theme.colors.surface;
      border = theme.colors.border;
      bottomBorder = theme.colors.textSecondary + "50";
      shadow = theme.colors.textPrimary;
      text = theme.colors.textPrimary;
    }

    return { bg, border, bottomBorder, shadow, text };
  }, [theme, variant, disabled]);

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
          backgroundColor: colors.bg,
          borderWidth: 1,
          borderBottomWidth: pressed ? 1 : 3,
          borderColor: colors.border,
          borderBottomColor: colors.bottomBorder,
          shadowColor: colors.shadow,
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
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={handlePress}
      {...pressableProps}
    >
      <AppText
        variant="body"
        style={{
          fontWeight: "700",
          color: colors.text,
          letterSpacing: 0.3,
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}
