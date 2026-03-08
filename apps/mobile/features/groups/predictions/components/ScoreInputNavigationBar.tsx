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
  teamLogo,
}: ScoreInputNavigationBarProps) {
  const { theme, colorScheme } = useTheme();
  const isDark = colorScheme === "dark";

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
  const bgColor = isDark ? theme.colors.surface + "FA" : theme.colors.surface + "FA";

  return (
    <View
      style={[styles.container, { bottom: keyboardHeight + bottomOffset, shadowColor: theme.colors.textPrimary }]}
      pointerEvents="box-none"
    >
      <View style={[styles.content, { backgroundColor: bgColor, borderColor: isDark ? theme.colors.textInverse + "1A" : theme.colors.textPrimary + "14" }]}>
        {/* Left section: Navigation arrows */}
        <View style={styles.leftSection}>
          <Pressable
            style={[
              styles.navButton,
              { backgroundColor: isDark ? theme.colors.textInverse + "1A" : theme.colors.textPrimary + "0D" },
              !canGoPrevious && styles.buttonDisabled,
            ]}
            onPress={canGoPrevious ? onPrevious : undefined}
            disabled={!canGoPrevious}
          >
            <Ionicons
              name="chevron-up"
              size={24}
              color={canGoPrevious ? theme.colors.textPrimary : theme.colors.textSecondary}
            />
          </Pressable>

          <Pressable
            style={[
              styles.navButton,
              { backgroundColor: isDark ? theme.colors.textInverse + "1A" : theme.colors.textPrimary + "0D" },
              !canGoNext && styles.buttonDisabled,
            ]}
            onPress={canGoNext ? onNext : undefined}
            disabled={!canGoNext}
          >
            <Ionicons
              name="chevron-down"
              size={24}
              color={canGoNext ? theme.colors.textPrimary : theme.colors.textSecondary}
            />
          </Pressable>
        </View>

        {/* Middle section: Team name */}
        <View style={styles.middleSection}>
          {teamName && (
            <AppText
              variant="body"
              style={styles.teamName}
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
            <Ionicons name="checkmark" size={24} color={theme.colors.textInverse} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 8,
    right: 8,
    zIndex: 1000,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
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
    marginLeft: 8,
  },
  teamName: {
    fontSize: 14,
    fontWeight: "600",
  },
  navButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    width: 48,
    height: 48,
  },
  doneButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    width: 48,
    height: 48,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
});
