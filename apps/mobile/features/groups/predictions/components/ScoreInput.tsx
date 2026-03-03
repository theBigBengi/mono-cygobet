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
            type === "home" ? styles.inputHome : styles.inputAway,
            {
              backgroundColor: "transparent",
              borderColor: isFocused
                ? theme.colors.primary + "80"
                : theme.colors.textSecondary + "60",
              borderWidth: 1,
              justifyContent: "center",
              alignItems: "center",
            },
            type === "home" && { borderBottomWidth: 0 },
          ]}
        >
          <AppText
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: isFocused
                ? theme.colors.primary
                : hasValue
                  ? theme.colors.textPrimary
                  : theme.colors.textSecondary,
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

  // Live game - same style as editable but text always secondary
  if (isLive) {
    return (
      <View
        style={[
          styles.finishedInput,
          type === "home" ? styles.inputHome : styles.inputAway,
          {
            backgroundColor: "transparent",
            borderColor: theme.colors.textSecondary + "60",
            borderWidth: 1,
          },
          type === "home" && { borderBottomWidth: 0 },
        ]}
      >
        <AppText
          variant="body"
          style={{
            fontSize: 15,
            fontWeight: "700",
            color: theme.colors.textSecondary,
          }}
        >
          {toDisplay(value, !isEditable)}
        </AppText>
      </View>
    );
  }

  // Non-editable, not finished - same style as editable but text always secondary
  if (!isFinished) {
    return (
      <View
        style={[
          styles.finishedInput,
          type === "home" ? styles.inputHome : styles.inputAway,
          {
            backgroundColor: "transparent",
            borderColor: theme.colors.textSecondary + "60",
            borderWidth: 1,
          },
          type === "home" && { borderBottomWidth: 0 },
        ]}
      >
        <AppText
          variant="body"
          style={{
            fontSize: 15,
            fontWeight: "700",
            color: theme.colors.textSecondary,
          }}
        >
          {toDisplay(value, !isEditable)}
        </AppText>
      </View>
    );
  }

  // Finished game - show result with correct/incorrect styling
  const bgColor = isCorrect === "max"
    ? theme.colors.success + "20"
    : isCorrect === true
      ? theme.colors.warning + "20"
      : isCorrect === false
        ? theme.colors.danger + "15"
        : theme.colors.surface;

  const borderColor = isCorrect === "max"
    ? theme.colors.success + "60"
    : isCorrect === true
      ? theme.colors.warning + "60"
      : isCorrect === false
        ? theme.colors.danger + "40"
        : theme.colors.border;

  const textColor = isCorrect === "max"
    ? theme.colors.success
    : isCorrect === true
      ? theme.colors.warning
      : isCorrect === false
        ? theme.colors.danger
        : theme.colors.textSecondary;

  return (
    <View
      style={[
        styles.finishedInput,
        type === "home" ? styles.inputHome : styles.inputAway,
        {
          backgroundColor: bgColor,
          borderColor: borderColor,
          borderWidth: 1,
        },
        type === "home" && { borderBottomWidth: 0 },
      ]}
    >
      <AppText
        variant="body"
        style={{
          fontSize: 15,
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
    borderRadius: 6,
  },
  inputWrapperFocused: {
  },
  inputHome: {
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  inputAway: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  input: {
    width: 28,
    height: 28,
    fontSize: 15,
    fontWeight: "700",
    borderRadius: 6,
    textAlignVertical: "center",
    includeFontPadding: false,
  },
  finishedInput: {
    width: 28,
    height: 28,
    borderRadius: 6,
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
