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
  /** Whether the prediction for this field was correct (for finished games). "max" = perfect prediction. */
  isCorrect?: boolean | "max";
  isLive?: boolean;
};

/**
 * Reusable score input component for home/away predictions
 * Handles both editable (TextInput) and read-only (View) modes
 * Game-like styling with visual feedback
 */
function ScoreInputInner({
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
  isLive,
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
    const displayText = toDisplay(value) || "–";

    return (
      <View style={[
        styles.inputWrapper,
        isFocused && styles.inputWrapperFocused,
      ]}>
        <View
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surface,
              borderColor: isFocused
                ? theme.colors.primary + "80"
                : theme.colors.border,
              borderWidth: 1,
              justifyContent: "center",
              alignItems: "center",
            },
          ]}
        >
          <AppText
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: isFocused
                ? theme.colors.primary
                : hasValue
                  ? "#374151"
                  : theme.colors.textSecondary + "80",
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

  // Live game - neutral dark tones
  if (isLive) {
    return (
      <View
        style={[
          styles.finishedInput,
          {
            backgroundColor: theme.colors.surface,
            borderColor: "#6B7280",
            borderWidth: 1,
          },
        ]}
      >
        <AppText
          variant="body"
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: "#374151",
          }}
        >
          {toDisplay(value, !isEditable)}
        </AppText>
      </View>
    );
  }

  // Finished game - show result with correct/incorrect styling
  const bgColor = isCorrect === "max"
    ? "#10B981" + "20"
    : isCorrect === true
      ? "#FFB020" + "20"
      : isCorrect === false
        ? "#EF4444" + "15"
        : theme.colors.surface;

  const borderColor = isCorrect === "max"
    ? "#10B981" + "60"
    : isCorrect === true
      ? "#FFB020" + "60"
      : isCorrect === false
        ? "#EF4444" + "40"
        : theme.colors.border;

  const textColor = isCorrect === "max"
    ? "#10B981"
    : isCorrect === true
      ? "#D4920A"
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

export const ScoreInput = React.memo(ScoreInputInner);

const styles = StyleSheet.create({
  inputWrapper: {
    borderRadius: 10,
  },
  inputWrapperFocused: {
  },
  input: {
    width: 36,
    height: 36,
    fontSize: 18,
    fontWeight: "700",
    borderRadius: 10,
    textAlignVertical: "center",
    includeFontPadding: false,
  },
  finishedInput: {
    width: 36,
    height: 36,
    borderRadius: 10,
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
