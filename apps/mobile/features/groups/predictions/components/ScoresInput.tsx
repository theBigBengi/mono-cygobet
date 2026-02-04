import React from "react";
import {
  View,
  StyleSheet,
  TextInput,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { GroupPrediction } from "@/features/group-creation/selection/games";

type Variant = "small" | "large";

type Props = {
  prediction: GroupPrediction;
  homeRef: React.RefObject<TextInput | null> | undefined;
  awayRef: React.RefObject<TextInput | null> | undefined;
  homeFocused?: boolean;
  awayFocused?: boolean;
  isSaved?: boolean;
  isEditable: boolean;
  isLive: boolean;
  onFocus: (type: "home" | "away") => void;
  onBlur?: () => void;
  onChange: (type: "home" | "away", nextText: string) => void;
  onAutoNext?: (type: "home" | "away") => void;
  variant?: Variant;
  containerStyle?: StyleProp<ViewStyle>;
};

function toDisplay(value: number | null, isEditable: boolean): string {
  if (value === null) return isEditable ? "" : "-";
  return String(value);
}

const variantStyles: Record<
  Variant,
  { input: TextStyle; separator: TextStyle }
> = {
  small: {
    input: {
      width: 28,
      height: 28,
      fontSize: 16,
    },
    separator: {
      fontSize: 16,
      fontWeight: "600",
      marginHorizontal: 1,
    },
  },
  large: {
    input: {
      width: 48,
      height: 48,
      fontSize: 24,
    },
    separator: {
      fontSize: 24,
      fontWeight: "700",
      marginHorizontal: 2,
    },
  },
};

/**
 * Reusable score input component for home and away scores.
 * Supports different sizes via variant prop.
 */
export function ScoresInput({
  prediction,
  homeRef,
  awayRef,
  homeFocused,
  awayFocused,
  isSaved = false,
  isEditable,
  isLive,
  onFocus,
  onBlur,
  onChange,
  onAutoNext,
  variant = "small",
  containerStyle,
}: Props) {
  const { theme } = useTheme();
  const variantStyle = variantStyles[variant];
  const isLarge = variant === "large";

  const handleHomeChange = (text: string) => {
    if (isEditable) {
      // For large variant (SingleGameMatchCard), use only the last digit
      const finalText = isLarge
        ? text.length > 0
          ? text[text.length - 1]
          : ""
        : text;
      // Haptic feedback when entering prediction
      if (process.env.EXPO_OS === "ios" && finalText !== "") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onChange("home", finalText);
      if (finalText !== "" && onAutoNext) onAutoNext("home");
    }
  };

  const handleAwayChange = (text: string) => {
    if (isEditable) {
      // For large variant (SingleGameMatchCard), use only the last digit
      const finalText = isLarge
        ? text.length > 0
          ? text[text.length - 1]
          : ""
        : text;
      // Haptic feedback when entering prediction
      if (process.env.EXPO_OS === "ios" && finalText !== "") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onChange("away", finalText);
      if (finalText !== "" && onAutoNext) onAutoNext("away");
    }
  };

  const inputStyle: TextStyle = {
    ...variantStyle.input,
    borderRadius: isLarge ? 8 : 4,
    borderWidth: 1,
    fontWeight: "700",
  };

  const separatorStyle: TextStyle = {
    ...variantStyle.separator,
  };

  return (
    <View
      style={[styles.scoreSection, containerStyle]}
      pointerEvents={isEditable ? "auto" : "none"}
    >
      <TextInput
        ref={homeRef}
        editable={isEditable}
        style={[
          inputStyle,
          {
            borderColor: homeFocused
              ? theme.colors.textSecondary
              : isSaved
                ? "rgba(34, 197, 94, 0.4)"
                : theme.colors.border,
            borderWidth: homeFocused ? 2 : inputStyle.borderWidth,
            backgroundColor: isSaved
              ? "rgba(34, 197, 94, 0.03)"
              : "rgba(15, 23, 42, 0.04)",
            color: theme.colors.textPrimary,
            opacity: isEditable || isLive ? 1 : 0.5,
          },
        ]}
        value={toDisplay(prediction.home, isEditable)}
        onChangeText={handleHomeChange}
        keyboardType="number-pad"
        maxLength={2}
        textAlign="center"
        onFocus={() => {
          if (isEditable) {
            onFocus("home");
          }
        }}
        onBlur={onBlur}
        placeholder=""
        placeholderTextColor={theme.colors.textSecondary}
      />
      <AppText variant="body" style={separatorStyle}>
        :
      </AppText>
      <TextInput
        ref={awayRef}
        editable={isEditable}
        style={[
          inputStyle,
          {
            borderColor: awayFocused
              ? theme.colors.textSecondary
              : isSaved
                ? "rgba(34, 197, 94, 0.4)"
                : theme.colors.border,
            borderWidth: awayFocused ? 2 : inputStyle.borderWidth,
            backgroundColor: isSaved
              ? "rgba(34, 197, 94, 0.03)"
              : "rgba(15, 23, 42, 0.04)",
            color: theme.colors.textPrimary,
            opacity: isEditable || isLive ? 1 : 0.5,
          },
        ]}
        value={toDisplay(prediction.away, isEditable)}
        onChangeText={handleAwayChange}
        keyboardType="number-pad"
        maxLength={2}
        textAlign="center"
        onFocus={() => {
          if (isEditable) {
            onFocus("away");
          }
        }}
        onBlur={onBlur}
        placeholder=""
        placeholderTextColor={theme.colors.textSecondary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scoreSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    direction: "ltr",
  },
});
