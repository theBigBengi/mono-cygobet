import React from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
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
 * Uses BlurView for translucent background on iOS, solid fallback on Android.
 */
export function GroupGamesHeader({
  onBack,
  children,
  backOnly,
  rightContent,
}: GroupGamesHeaderProps) {
  const { theme, colorScheme } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === "dark";

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          height: HEADER_HEIGHT + insets.top,
        },
      ]}
      pointerEvents="box-none"
    >
      {/* Blur background */}
      <BlurView
        intensity={60}
        tint={isDark ? "dark" : "light"}
        style={[
          StyleSheet.absoluteFill,
          Platform.OS === "android" && {
            backgroundColor: isDark
              ? "rgba(16, 16, 20, 0.92)"
              : "rgba(246, 246, 246, 0.92)",
          },
        ]}
      />
      {/* Bottom fade for smooth transition */}
      <View
        style={[
          styles.bottomFade,
          {
            borderBottomColor: isDark
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.06)",
          },
        ]}
      />

      {/* Content */}
      <View style={styles.content} pointerEvents="box-none">
        <Pressable onPress={onBack} style={styles.backButton}>
          <View
            style={[
              styles.iconButton,
              {
                backgroundColor: theme.colors.cardBackground,
                borderColor: theme.colors.border,
                borderBottomColor: theme.colors.textSecondary + "40",
              },
            ]}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={theme.colors.textSecondary}
            />
          </View>
        </Pressable>
        {!backOnly && children && (
          <View style={styles.childrenArea}>{children}</View>
        )}
        {backOnly && <View style={styles.spacer} />}
        {rightContent && (
          <View style={styles.rightContent}>{rightContent}</View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  bottomFade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingEnd: 12,
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
    borderWidth: 1,
    borderBottomWidth: 2,
  },
  childrenArea: {
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
