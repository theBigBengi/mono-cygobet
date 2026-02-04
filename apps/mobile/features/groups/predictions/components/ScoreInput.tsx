import React from "react";
import { View, TextInput, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import {
  INPUT_STYLE,
  INPUT_BACKGROUND_COLOR,
  INPUT_BACKGROUND_COLOR_DISABLED,
} from "../utils/constants";
import { toDisplay } from "../utils/fixture-helpers";

type ScoreInputProps = {
  type: "home" | "away";
  value: number | null;
  isFocused: boolean;
  isEditable: boolean;
  isFinished: boolean;
  inputRef: React.RefObject<TextInput | null>;
  onChange: (text: string) => void;
  onFocus: () => void;
  onBlur?: () => void;
  onAutoNext?: () => void;
};

/**
 * Reusable score input component for home/away predictions
 * Handles both editable (TextInput) and read-only (View) modes
 */
export function ScoreInput({
  type,
  value,
  isFocused,
  isEditable,
  isFinished,
  inputRef,
  onChange,
  onFocus,
  onBlur,
  onAutoNext,
}: ScoreInputProps) {
  const { theme } = useTheme();

  const handleChange = (text: string) => {
    if (isEditable) {
      onChange(text);
      if (text !== "" && onAutoNext) {
        onAutoNext();
      }
    }
  };

  if (isEditable) {
    return (
      <TextInput
        ref={inputRef}
        editable={isEditable}
        style={[
          INPUT_STYLE,
          {
            borderColor: isFocused
              ? theme.colors.textSecondary
              : theme.colors.textSecondary,
            borderWidth: isFocused ? 2 : 0.5,
            backgroundColor: INPUT_BACKGROUND_COLOR,
            color: theme.colors.textPrimary,
          },
        ]}
        value={toDisplay(value)}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={2}
        textAlign="center"
        onFocus={() => {
          if (isEditable) {
            // Haptic feedback when focusing on input field
            if (process.env.EXPO_OS === "ios") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            onFocus();
          }
        }}
        onBlur={onBlur}
        placeholder=""
        placeholderTextColor={theme.colors.textSecondary}
      />
    );
  }

  return (
    <View
      style={[
        INPUT_STYLE,
        {
          borderWidth: 0,
          backgroundColor: INPUT_BACKGROUND_COLOR_DISABLED,
          justifyContent: "center",
          alignItems: "center",
        },
      ]}
    >
      <AppText
        variant="body"
        style={{
          fontSize: 16,
          fontWeight: "600",
          color: theme.colors.textSecondary,
        }}
      >
        {toDisplay(value, !isEditable)}
      </AppText>
    </View>
  );
}
