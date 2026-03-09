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
import { AppText, TeamLogo } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { toDisplay } from "../utils/fixture-helpers";
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
  homeTeamLogo?: string | null;
  awayTeamLogo?: string | null;
  homeTeamName?: string;
  awayTeamName?: string;
};

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
      width: 64,
      height: 100,
      fontSize: 84,
    },
    separator: {
      fontSize: 60,
      lineHeight: 48,
      fontWeight: "700",
      marginHorizontal: 8,
    },
  },
};

/**
 * Reusable score input component for home and away scores.
 * Supports different sizes via variant prop.
 */
export const ScoresInput = React.memo(function ScoresInput({
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
  homeTeamLogo,
  awayTeamLogo,
  homeTeamName,
  awayTeamName,
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
    borderRadius: isLarge ? 4 : isMediumOrLarge ? 12 : 8,
    fontWeight: "700",
  };

  const separatorStyle: TextStyle = {
    fontSize: variantStyle.separator.fontSize,
    fontWeight: variantStyle.separator.fontWeight as TextStyle["fontWeight"],
    marginHorizontal: variantStyle.separator.marginHorizontal,
    lineHeight: variantStyle.separator.fontSize as number,
    includeFontPadding: false,
    textAlignVertical: "center",
  };

  return (
    <View
      style={[styles.scoreSection, containerStyle]}
      pointerEvents={isEditable ? "auto" : "none"}
    >
      <View style={[inputStyle, styles.inputWrapper, {
        borderWidth: isLarge ? 0 : 1,
        borderColor: homeFocused
          ? theme.colors.primary
          : theme.colors.border,
        backgroundColor: isLarge ? "transparent" : homeFocused
          ? theme.colors.primary
          : theme.colors.surface,
        opacity: isEditable || isLive ? 1 : 0.5,
        ...(isLarge ? {} : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: homeFocused ? 0.2 : 0.1,
          shadowRadius: 3,
          elevation: 2,
        }),
      }]}>
        <TextInput
          ref={homeRef}
          editable={isEditable}
          style={[
            styles.fieldInput,
            {
              fontSize: variantStyle.input.fontSize,
              fontWeight: "700",
              color: homeFocused ? (isLarge ? theme.colors.textPrimary : theme.colors.primaryText) : theme.colors.textPrimary,
            },
          ]}
          value={toDisplay(prediction.home, !isEditable)}
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
      </View>
      {(prediction.home != null || prediction.away != null) && (
        <View style={{ height: variantStyle.input.height, justifyContent: "center" }}>
          <AppText variant="body" style={separatorStyle}>
            :
          </AppText>
        </View>
      )}
      <View style={[inputStyle, styles.inputWrapper, {
        borderWidth: isLarge ? 0 : 1,
        borderColor: awayFocused
          ? theme.colors.primary
          : theme.colors.border,
        backgroundColor: isLarge ? "transparent" : awayFocused
          ? theme.colors.primary
          : theme.colors.surface,
        opacity: isEditable || isLive ? 1 : 0.5,
        ...(isLarge ? {} : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: awayFocused ? 0.2 : 0.1,
          shadowRadius: 3,
          elevation: 2,
        }),
      }]}>
        <TextInput
          ref={awayRef}
          editable={isEditable}
          style={[
            styles.fieldInput,
            {
              fontSize: variantStyle.input.fontSize,
              fontWeight: "700",
              color: awayFocused ? (isLarge ? theme.colors.textPrimary : theme.colors.primaryText) : theme.colors.textPrimary,
            },
          ]}
          value={toDisplay(prediction.away, !isEditable)}
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
    </View>
  );
});

const styles = StyleSheet.create({
  scoreSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
    writingDirection: "ltr",
  },
  inputWrapper: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  fieldLogo: {
    position: "absolute",
    opacity: 0.15,
  },
  fieldInput: {
    width: "100%",
    height: "100%",
    padding: 0,
    textAlignVertical: "center",
    includeFontPadding: false,
    textAlign: "center",
  },
});
