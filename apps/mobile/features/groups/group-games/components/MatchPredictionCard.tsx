import React from "react";
import { View, StyleSheet, TextInput } from "react-native";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { GameCardBase } from "@/components/Fixtures";
import type { GroupPrediction } from "@/features/groups/games-selection/group-games-selection.types";
import type { FixtureItem } from "../types";

type Props = {
  fixture: FixtureItem;
  prediction: GroupPrediction;
  homeRef: React.RefObject<TextInput | null> | undefined;
  awayRef: React.RefObject<TextInput | null> | undefined;
  homeFocused?: boolean;
  awayFocused?: boolean;
  positionInGroup?: "single" | "top" | "middle" | "bottom";
  isSaved?: boolean;
  onFocus: (type: "home" | "away") => void;
  onBlur?: () => void;
  onChange: (type: "home" | "away", nextText: string) => void;
  onAutoNext?: (type: "home" | "away") => void;
};

function toDisplay(value: number | null): string {
  return value === null ? "" : String(value);
}

/**
 * Match card + score prediction inputs (single digit per team).
 * - Uses selectTextOnFocus to allow fast replacement without fiddly cursor behavior.
 * - Triggers onAutoNext after a valid digit input to advance to the next field.
 */
export function MatchPredictionCard({
  fixture,
  prediction,
  homeRef,
  awayRef,
  homeFocused,
  awayFocused,
  positionInGroup = "single",
  isSaved = false,
  onFocus,
  onBlur,
  onChange,
  onAutoNext,
}: Props) {
  const { theme } = useTheme();

  const scoreSection = (
    <View style={styles.scoreSection}>
      <TextInput
        ref={homeRef}
        style={[
          styles.scoreInput,
          {
            borderColor: homeFocused
              ? theme.colors.textSecondary
              : isSaved
                ? "rgba(34, 197, 94, 0.4)"
                : theme.colors.border,
            borderWidth: homeFocused ? 2 : styles.scoreInput.borderWidth,
            backgroundColor: isSaved
              ? "rgba(34, 197, 94, 0.03)"
              : "rgba(15, 23, 42, 0.04)",
            color: theme.colors.textPrimary,
          },
        ]}
        value={toDisplay(prediction.home)}
        onChangeText={(text) => {
          onChange("home", text);
          if (text !== "" && onAutoNext) onAutoNext("home");
        }}
        keyboardType="number-pad"
        maxLength={2}
        textAlign="center"
        onFocus={() => onFocus("home")}
        onBlur={onBlur}
        placeholder=""
        placeholderTextColor={theme.colors.textSecondary}
      />
      <AppText variant="body" style={styles.scoreSeparator}>
        :
      </AppText>
      <TextInput
        ref={awayRef}
        style={[
          styles.scoreInput,
          {
            borderColor: awayFocused
              ? theme.colors.textSecondary
              : isSaved
                ? "rgba(34, 197, 94, 0.4)"
                : theme.colors.border,
            borderWidth: awayFocused ? 2 : styles.scoreInput.borderWidth,
            backgroundColor: isSaved
              ? "rgba(34, 197, 94, 0.03)"
              : "rgba(15, 23, 42, 0.04)",
            color: theme.colors.textPrimary,
          },
        ]}
        value={toDisplay(prediction.away)}
        onChangeText={(text) => {
          onChange("away", text);
          if (text !== "" && onAutoNext) onAutoNext("away");
        }}
        keyboardType="number-pad"
        maxLength={2}
        textAlign="center"
        onFocus={() => onFocus("away")}
        onBlur={onBlur}
        placeholder=""
        placeholderTextColor={theme.colors.textSecondary}
      />
    </View>
  );

  return (
    <GameCardBase fixture={fixture} positionInGroup={positionInGroup}>
      {scoreSection}
    </GameCardBase>
  );
}

const styles = StyleSheet.create({
  scoreSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
  },
  scoreInput: {
    width: 28,
    height: 28,
    borderRadius: 4,
    borderWidth: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  scoreSeparator: {
    fontSize: 16,
    fontWeight: "600",
    marginHorizontal: 1,
  },
});
