// components/ui/AppHeader.tsx
// Generic app header with back button, optional title, and optional left/right content.

import React from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "./AppText";

const HEADER_HEIGHT = 64;

export interface AppHeaderProps {
  onBack: () => void;
  /** Optional title shown next to back button when no leftContent */
  title?: string;
  /** Optional content to show on the left (after back button) */
  leftContent?: React.ReactNode;
  /** Optional content to show on the right */
  rightContent?: React.ReactNode;
}

export function AppHeader({
  onBack,
  title,
  leftContent,
  rightContent,
}: AppHeaderProps) {
  const { theme } = useTheme();

  const showTitle = title && !leftContent;

  return (
    <View
      style={[
        styles.container,
        Platform.OS === "android" && { elevation: 0 },
        {
          backgroundColor: theme.colors.surface,
          height: HEADER_HEIGHT,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.leftRow}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onBack();
          }}
          style={({ pressed }) => [
            styles.backButton,
            {
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
              borderBottomColor: pressed
                ? theme.colors.border
                : theme.colors.textSecondary + "40",
              transform: [{ scale: pressed ? 0.95 : 1 }],
            },
          ]}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={theme.colors.textPrimary}
          />
        </Pressable>
        {leftContent ? (
          leftContent
        ) : showTitle ? (
          <AppText
            variant="subtitle"
            style={[styles.titleText, { color: theme.colors.textPrimary }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {title}
          </AppText>
        ) : null}
      </View>
      {rightContent ? (
        <View style={styles.rightRow}>{rightContent}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderBottomWidth: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  leftRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  titleText: {
    flex: 1,
    fontWeight: "600",
  },
  rightRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});
