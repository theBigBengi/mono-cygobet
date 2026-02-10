// features/groups/predictions/components/ScoreInputNavigationBar.tsx
// Floating navigation bar for score input fields.
// Appears above keyboard to help navigate between input fields.

import React from "react";
import { View, StyleSheet, Pressable, Keyboard, ActivityIndicator, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

interface ScoreInputNavigationBarProps {
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  keyboardHeight: number;
  onDone?: () => void;
  isSaving?: boolean;
}

export function ScoreInputNavigationBar({
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
  keyboardHeight,
  onDone,
  isSaving,
}: ScoreInputNavigationBarProps) {
  const { theme, colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const keyColor = theme.colors.keyboardKey;
  const keyColorDisabled = theme.colors.keyboardKey + "80";

  // Don't show if keyboard is not visible
  if (keyboardHeight === 0) {
    return null;
  }

  const handleDone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onDone) {
      onDone();
    } else {
      Keyboard.dismiss();
    }
  };

  const bottomOffset = Platform.OS === "android" ? 60 : 10;

  return (
    <View
      style={[styles.container, { bottom: keyboardHeight + bottomOffset }]}
      pointerEvents="box-none"
    >
      <View style={[styles.content, styles.contentClip, {
        borderColor: theme.colors.border,
      }]} pointerEvents="box-none">
        <BlurView
          intensity={50}
          tint={isDark ? "dark" : "light"}
          style={[
            StyleSheet.absoluteFill,
            Platform.OS === "android" && {
              backgroundColor: isDark ? "rgba(30, 30, 30, 0.95)" : "rgba(255, 255, 255, 0.95)",
            },
          ]}
          pointerEvents="box-none"
        />
        <View style={styles.row}>
        {/* Left section: Navigation arrows — iOS keyboard key color */}
        <View style={styles.leftSection}>
          <Pressable
            style={[
              styles.navButton,
              !canGoPrevious && styles.buttonDisabled,
              {
                borderColor: theme.colors.border,
                backgroundColor: canGoPrevious ? keyColor : keyColorDisabled,
              },
            ]}
            onPress={canGoPrevious ? onPrevious : undefined}
            disabled={!canGoPrevious}
          >
            <Ionicons
              name="chevron-up"
              size={32}
              
              color={
                canGoPrevious
                  ? theme.colors.textPrimary
                  : theme.colors.textSecondary
              }
            />
          </Pressable>

          <Pressable
            style={[
              styles.navButton,
              !canGoNext && styles.buttonDisabled,
              {
                borderColor: theme.colors.border,
                backgroundColor: canGoNext ? keyColor : keyColorDisabled,
              },
            ]}
            onPress={canGoNext ? onNext : undefined}
            disabled={!canGoNext}
          >
            <Ionicons
              name="chevron-down"
              size={32}
              color={
                canGoNext
                  ? theme.colors.textPrimary
                  : theme.colors.textSecondary
              }
            />
          </Pressable>
        </View>

        {/* Middle section: Empty spacer */}
        <View style={styles.middleSection} />

        {/* Right section: Done button */}
        <View style={styles.rightSection}>
          <Pressable
            style={[
              styles.doneButton,
              {
                backgroundColor: theme.colors.primary,
              },
            ]}
            onPress={handleDone}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="checkmark" size={32} color="#FFFFFF" />
            )}
            {/* <AppText
              variant="caption"
              style={[
                styles.buttonText,
                {
                  color: "#FFFFFF",
                },
              ]}
            >
              Done
            </AppText> */}
          </Pressable>
        </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 4,
    right: 4,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderRadius: 99,
  },
  contentClip: {
    overflow: "hidden",
  },
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  middleSection: {
    flex: 1,
  },
  rightSection: {
    // Right section for done button
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 99,
    minWidth: 44,
    height: 44,
    borderWidth: 1,
  },
  doneButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    // paddingVertical: 8,
    // paddingHorizontal: 16,
    borderRadius: 99,
    gap: 6,
    minWidth: 44,
    height: 44,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontWeight: "600",
  },
  separator: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
});
