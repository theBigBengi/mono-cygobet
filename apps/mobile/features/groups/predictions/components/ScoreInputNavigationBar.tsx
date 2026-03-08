// features/groups/predictions/components/ScoreInputNavigationBar.tsx
// Floating navigation bar for score input fields.
// Appears above keyboard to help navigate between input fields.

import React from "react";
import { View, StyleSheet, Pressable, Keyboard, ActivityIndicator, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";

interface ScoreInputNavigationBarProps {
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  keyboardHeight: number;
  onDone?: () => void;
  isSaving?: boolean;
  teamName?: string;
  teamLogo?: string | null;
}

export function ScoreInputNavigationBar({
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
  keyboardHeight,
  onDone,
  isSaving,
  teamName,
}: ScoreInputNavigationBarProps) {
  const { theme } = useTheme();

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
      <View style={[styles.content, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        {/* Left section: Navigation arrows */}
        <View style={styles.leftSection}>
          <Pressable
            style={[
              styles.navButton,
              { backgroundColor: theme.colors.textSecondary + "12" },
              !canGoPrevious && styles.buttonDisabled,
            ]}
            onPress={canGoPrevious ? onPrevious : undefined}
            disabled={!canGoPrevious}
          >
            <Ionicons
              name="chevron-up"
              size={20}
              color={canGoPrevious ? theme.colors.textPrimary : theme.colors.textSecondary}
            />
          </Pressable>

          <Pressable
            style={[
              styles.navButton,
              { backgroundColor: theme.colors.textSecondary + "12" },
              !canGoNext && styles.buttonDisabled,
            ]}
            onPress={canGoNext ? onNext : undefined}
            disabled={!canGoNext}
          >
            <Ionicons
              name="chevron-down"
              size={20}
              color={canGoNext ? theme.colors.textPrimary : theme.colors.textSecondary}
            />
          </Pressable>
        </View>

        {/* Middle section: Team name */}
        <View style={styles.middleSection}>
          {teamName && (
            <AppText
              variant="body"
              style={[styles.teamName, { color: theme.colors.textPrimary }]}
              numberOfLines={1}
            >
              {teamName}
            </AppText>
          )}
        </View>

        {/* Right section: Done button */}
        <Pressable
          style={[styles.doneButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleDone}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={theme.colors.textInverse} />
          ) : (
            <Ionicons name="checkmark" size={20} color={theme.colors.textInverse} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 1000,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  middleSection: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "center",
    marginStart: 4,
  },
  teamName: {
    fontSize: 13,
    fontWeight: "600",
  },
  navButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    width: 36,
    height: 36,
  },
  doneButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    width: 36,
    height: 36,
  },
  buttonDisabled: {
    opacity: 0.35,
  },
});
