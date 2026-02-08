// components/ui/AppHeader.tsx
// Generic app header with back button, optional title, and optional left/right content.

import React from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
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
        { backgroundColor: theme.colors.background, height: HEADER_HEIGHT },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.leftRow}>
        <Pressable onPress={onBack}>
          <View
            style={[
              styles.iconButton,
              styles.iconButtonClip,
              { borderWidth: 0, backgroundColor: theme.colors.background },
            ]}
          >
            <View style={styles.iconButtonInner}>
              <Ionicons
                name="chevron-back"
                size={20}
                color={theme.colors.textPrimary}
              />
            </View>
          </View>
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
    paddingHorizontal: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 99,
    justifyContent: "center",
    alignItems: "center",
  },
  iconButtonClip: {
    overflow: "hidden",
  },
  iconButtonInner: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  leftRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  titleText: {
    flex: 1,
  },
  rightRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});
