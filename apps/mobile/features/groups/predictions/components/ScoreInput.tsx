import React from "react";
import { View, TextInput, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
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
  /** Whether the prediction for this field was correct (for finished games) */
  isCorrect?: boolean;
};

/**
 * Reusable score input component for home/away predictions
 * Handles both editable (TextInput) and read-only (View) modes
 * Game-like styling with visual feedback
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
  isCorrect,
}: ScoreInputProps) {
  const { theme } = useTheme();

  const handleChange = (text: string) => {
    if (!isEditable || !text) return;

    // Clear the hidden input immediately
    if (inputRef.current) {
      inputRef.current.clear();
    }

    // Pass the single digit to parent
    onChange(text);

    if (onAutoNext) {
      onAutoNext();
    }
  };

  // Editable input (before game)
  if (isEditable) {
    const hasValue = value !== null && value !== undefined;
    const displayText = toDisplay(value) || (isFocused ? "" : "–");

    return (
      <View style={[
        styles.inputWrapper,
        isFocused && styles.inputWrapperFocused,
      ]}>
        <View
          style={[
            styles.input,
            {
              backgroundColor: hasValue ? "#F1F5F9" : theme.colors.surface,
              borderColor: isFocused
                ? theme.colors.textPrimary
                : hasValue
                  ? "#94A3B8"
                  : theme.colors.border,
              borderWidth: isFocused ? 2 : 1,
              justifyContent: "center",
              alignItems: "center",
            },
          ]}
        >
          <AppText
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: hasValue ? theme.colors.textPrimary : theme.colors.textSecondary + "80",
            }}
          >
            {displayText}
          </AppText>
          <TextInput
            ref={inputRef}
            value=""
            editable={isEditable}
            style={styles.hiddenInput}
            onChangeText={handleChange}
            keyboardType="number-pad"
            maxLength={1}
            caretHidden
            contextMenuHidden
            selectTextOnFocus={false}
            onFocus={() => {
              if (isEditable) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onFocus();
              }
            }}
            onBlur={onBlur}
          />
        </View>
      </View>
    );
  }

  // Finished game - show result with correct/incorrect styling
  const bgColor = isCorrect === true
    ? "#10B981" + "20" // green tint
    : isCorrect === false
      ? "#EF4444" + "15" // red tint
      : theme.colors.surface;

  const borderColor = isCorrect === true
    ? "#10B981" + "60"
    : isCorrect === false
      ? "#EF4444" + "40"
      : theme.colors.border;

  const textColor = isCorrect === true
    ? "#10B981"
    : isCorrect === false
      ? "#EF4444"
      : theme.colors.textSecondary;

  return (
    <View
      style={[
        styles.finishedInput,
        {
          backgroundColor: bgColor,
          borderColor: borderColor,
          borderWidth: 1,
        },
      ]}
    >
      <AppText
        variant="body"
        style={{
          fontSize: 18,
          fontWeight: "700",
          color: textColor,
        }}
      >
        {toDisplay(value, !isEditable)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  inputWrapper: {
    borderRadius: 10,
    // Subtle shadow for depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  inputWrapperFocused: {
    // Glow effect when focused
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  input: {
    width: 40,
    height: 40,
    fontSize: 18,
    fontWeight: "700",
    borderRadius: 10,
    borderBottomWidth: 3,
    textAlignVertical: "center",
    includeFontPadding: false,
  },
  finishedInput: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderBottomWidth: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  hiddenInput: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    color: "transparent",
    backgroundColor: "transparent",
  },
});
