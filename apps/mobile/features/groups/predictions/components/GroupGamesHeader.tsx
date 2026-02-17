import React from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { HEADER_HEIGHT } from "../utils/constants";

interface GroupGamesHeaderProps {
  onBack: () => void;
  /** Optional content to show after back button (e.g., filter tabs) */
  children?: React.ReactNode;
  /** When true, only show back button without children content area */
  backOnly?: boolean;
  /** Optional content to show on the right side of the header */
  rightContent?: React.ReactNode;
}

/**
 * Header for Group Games screen.
 * Back button on the left, optional content (tabs) fills the rest.
 */
export function GroupGamesHeader({ onBack, children, backOnly, rightContent }: GroupGamesHeaderProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        Platform.OS === "android" && { elevation: 0 },
        {
          backgroundColor: theme.colors.background,
          paddingTop: insets.top,
          height: HEADER_HEIGHT + insets.top,
        },
      ]}
      pointerEvents="box-none"
    >
      <Pressable onPress={onBack} style={styles.backButton}>
        <View
          style={[
            styles.iconButton,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={theme.colors.textPrimary}
          />
        </View>
      </Pressable>
      {!backOnly && children && <View style={styles.content}>{children}</View>}
      {backOnly && <View style={styles.spacer} />}
      {rightContent && <View style={styles.rightContent}>{rightContent}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingEnd: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128, 128, 128, 0.3)",
  },
  backButton: {
    paddingHorizontal: 4,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 99,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  spacer: {
    flex: 1,
  },
  rightContent: {
    flexDirection: "row",
    alignItems: "center",
  },
});
