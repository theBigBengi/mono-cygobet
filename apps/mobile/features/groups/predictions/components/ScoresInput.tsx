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

type Variant = "small" | "medium" | "large";

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
  medium: {
    input: {
      width: 36,
      height: 36,
      fontSize: 20,
    },
    separator: {
      fontSize: 20,
      fontWeight: "700",
      marginHorizontal: 2,
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
  const isMediumOrLarge = variant === "medium" || variant === "large";

  const handleHomeChange = (text: string) => {
    if (isEditable) {
      // For large variant (SingleGameMatchCard), use only the last digit
      const finalText = isMediumOrLarge
        ? text.length > 0
          ? text[text.length - 1]
          : ""
        : text;
      // Haptic feedback when entering prediction
      if (finalText !== "") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onChange("home", finalText);
      if (finalText !== "" && onAutoNext) onAutoNext("home");
    }
  };

  const handleAwayChange = (text: string) => {
    if (isEditable) {
      // For large variant (SingleGameMatchCard), use only the last digit
      const finalText = isMediumOrLarge
        ? text.length > 0
          ? text[text.length - 1]
          : ""
        : text;
      // Haptic feedback when entering prediction
      if (finalText !== "") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onChange("away", finalText);
      if (finalText !== "" && onAutoNext) onAutoNext("away");
    }
  };

  const inputStyle: TextStyle = {
    ...variantStyle.input,
    borderRadius: isMediumOrLarge ? 12 : 8,
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
              ? theme.colors.primary
              : theme.colors.border,
            borderWidth: 1,
            backgroundColor: homeFocused
              ? theme.colors.primary
              : theme.colors.surface,
            color: homeFocused ? theme.colors.primaryText : theme.colors.textPrimary,
            opacity: isEditable || isLive ? 1 : 0.5,
            padding: 0,
            textAlignVertical: "center",
            includeFontPadding: false,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: homeFocused ? 0.2 : 0.1,
            shadowRadius: 3,
            elevation: 2,
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
              ? theme.colors.primary
              : theme.colors.border,
            borderWidth: 1,
            backgroundColor: awayFocused
              ? theme.colors.primary
              : theme.colors.surface,
            color: awayFocused ? theme.colors.primaryText : theme.colors.textPrimary,
            opacity: isEditable || isLive ? 1 : 0.5,
            padding: 0,
            textAlignVertical: "center",
            includeFontPadding: false,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: awayFocused ? 0.2 : 0.1,
            shadowRadius: 3,
            elevation: 2,
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
    writingDirection: "ltr",
  },
});
