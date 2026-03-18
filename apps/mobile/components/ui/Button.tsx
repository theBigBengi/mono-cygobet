// components/ui/Button.tsx
// Modern button component with refined 3D effects.
// - Uses Pressable with haptic feedback
// - Supports primary, secondary, danger, ghost variants
// - Refined shadow and press animation

import React, { useMemo } from "react";
import { Pressable, PressableProps } from "react-native";
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
    let bg: string, bottomBorder: string, shadow: string, text: string;

    if (disabled) {
      bg = theme.colors.cardBackground;
      bottomBorder = theme.colors.textDisabled;
      shadow = "transparent";
      text = theme.colors.textSecondary;
    } else if (isGhost) {
      bg = "transparent";
      bottomBorder = "transparent";
      shadow = "transparent";
      text = theme.colors.textSecondary;
    } else if (variant === "primary") {
      bg = theme.colors.primary;
      bottomBorder = theme.colors.textPrimary + "30";
      shadow = theme.colors.primary;
      text = theme.colors.primaryText;
    } else if (variant === "danger") {
      bg = theme.colors.danger;
      bottomBorder = theme.colors.textPrimary + "30";
      shadow = theme.colors.danger;
      text = theme.colors.primaryText;
    } else {
      // secondary
      bg = theme.colors.surface;
      bottomBorder = theme.colors.textSecondary + "30";
      shadow = theme.colors.textPrimary;
      text = theme.colors.textPrimary;
    }

    return { bg, bottomBorder, shadow, text };
  }, [theme, variant, disabled]);

  return (
    <Pressable
      style={(pressableState) => {
        const pressed = pressableState.pressed && !disabled;
        const baseStyle = {
          paddingVertical: theme.spacing.ms,
          paddingHorizontal: theme.spacing.lg,
          borderRadius: theme.radius.md,
          alignItems: "center" as const,
          justifyContent: "center" as const,
          minHeight: 50,
          backgroundColor: colors.bg,
          borderWidth: variant === "secondary" ? 1 : 0,
          borderColor: variant === "secondary" ? theme.colors.border : "transparent",
          borderBottomWidth: pressed ? 1 : 3,
          borderBottomColor: colors.bottomBorder,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: pressed ? 1 : 3 },
          shadowOpacity: disabled ? 0 : pressed ? 0.08 : 0.2,
          shadowRadius: pressed ? 2 : 6,
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
