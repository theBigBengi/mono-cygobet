/**
 * ScoreInputPair — compact side-by-side score inputs for horizontal card layout.
 *
 * Renders both home and away scores as a single visual unit: [home - away].
 * Each digit is tappable for editing, with a thin separator between them.
 * Designed for the horizontal card row where vertical stacking doesn't apply.
 */
import React from "react";
import { View, TextInput, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { toDisplay } from "../utils/fixture-helpers";

type ScoreInputPairProps = {
  homeValue: number | null;
  awayValue: number | null;
  isHomeFocused: boolean;
  isAwayFocused: boolean;
  isEditable: boolean;
  isFinished: boolean;
  isLive?: boolean;
  homeRef: React.RefObject<TextInput | null>;
  awayRef: React.RefObject<TextInput | null>;
  onHomeChange: (text: string) => void;
  onAwayChange: (text: string) => void;
  onHomeFocus: () => void;
  onAwayFocus: () => void;
  onBlur?: () => void;
  onHomeAutoNext?: () => void;
  onAwayAutoNext?: () => void;
  isCorrect?: boolean | "max";
};

function ScoreInputPairInner({
  homeValue,
  awayValue,
  isHomeFocused,
  isAwayFocused,
  isEditable,
  isFinished,
  isLive,
  homeRef,
  awayRef,
  onHomeChange,
  onAwayChange,
  onHomeFocus,
  onAwayFocus,
  onBlur,
  onHomeAutoNext,
  onAwayAutoNext,
  isCorrect,
}: ScoreInputPairProps) {
  const { theme } = useTheme();

  const getTextColor = (isFocused: boolean, hasValue: boolean) => {
    if (isFinished) {
      if (isCorrect === "max") return theme.colors.success;
      if (isCorrect === true) return theme.colors.warning;
      if (isCorrect === false) return theme.colors.danger;
      return theme.colors.textSecondary;
    }
    if (isLive) return theme.colors.textSecondary;
    if (isFocused) return theme.colors.primary;
    if (hasValue) return theme.colors.textPrimary;
    return theme.colors.textSecondary;
  };

  const handleChange = (
    ref: React.RefObject<TextInput | null>,
    onChange: (t: string) => void,
    onAutoNext?: () => void,
  ) => (text: string) => {
    if (!isEditable || !text) return;
    ref.current?.clear();
    onChange(text);
    onAutoNext?.();
  };

  const homeHasValue = homeValue !== null && homeValue !== undefined;
  const awayHasValue = awayValue !== null && awayValue !== undefined;
  const homeDisplay = isEditable ? (toDisplay(homeValue) || "–") : toDisplay(homeValue, true);
  const awayDisplay = isEditable ? (toDisplay(awayValue) || "–") : toDisplay(awayValue, true);
  const homeColor = getTextColor(isHomeFocused, homeHasValue);
  const awayColor = getTextColor(isAwayFocused, awayHasValue);
  const sepColor = theme.colors.textSecondary;

  return (
    <View style={styles.container}>
      {/* Home digit */}
      <View style={styles.digitSlot}>
        <AppText style={[styles.digitText, { color: homeColor }]}>
          {homeDisplay}
        </AppText>
        {isEditable && (
          <TextInput
            ref={homeRef}
            value=""
            editable
            style={styles.hiddenInput}
            onChangeText={handleChange(homeRef, onHomeChange, onHomeAutoNext)}
            keyboardType="number-pad"
            maxLength={1}
            caretHidden
            contextMenuHidden
            selectTextOnFocus={false}
            onFocus={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onHomeFocus();
            }}
            onBlur={onBlur}
          />
        )}
      </View>

      {/* Separator */}
      <AppText style={[styles.separator, { color: sepColor }]}>-</AppText>

      {/* Away digit */}
      <View style={styles.digitSlot}>
        <AppText style={[styles.digitText, { color: awayColor }]}>
          {awayDisplay}
        </AppText>
        {isEditable && (
          <TextInput
            ref={awayRef}
            value=""
            editable
            style={styles.hiddenInput}
            onChangeText={handleChange(awayRef, onAwayChange, onAwayAutoNext)}
            keyboardType="number-pad"
            maxLength={1}
            caretHidden
            contextMenuHidden
            selectTextOnFocus={false}
            onFocus={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onAwayFocus();
            }}
            onBlur={onBlur}
          />
        )}
      </View>
    </View>
  );
}

export const ScoreInputPair = React.memo(ScoreInputPairInner);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  digitSlot: {
    width: 18,
    height: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  digitText: {
    fontSize: 15,
    fontWeight: "700",
  },
  separator: {
    fontSize: 11,
    fontWeight: "500",
    marginHorizontal: 0,
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
