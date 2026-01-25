import React from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useTheme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";

export type GroupGamesViewMode = "list" | "single";

interface GroupGamesHeaderFullProps {
  backOnly?: false;
  viewMode: GroupGamesViewMode;
  onBack: () => void;
  onFillRandom: () => void;
  onToggleView: () => void;
}

interface GroupGamesHeaderBackOnlyProps {
  backOnly: true;
  onBack: () => void;
  /** Optional content to show on the left (after back button, e.g. group name) */
  leftContent?: React.ReactNode;
  /** Optional content to show on the right (e.g. group status) */
  rightContent?: React.ReactNode;
  viewMode?: GroupGamesViewMode;
  onFillRandom?: () => void;
  onToggleView?: () => void;
}

export type GroupGamesHeaderProps =
  | GroupGamesHeaderFullProps
  | GroupGamesHeaderBackOnlyProps;

/**
 * Shared header for Group Games / Group Lobby screens.
 * Back (left). When not backOnly: Dice + View toggle (right).
 * All buttons are round with blur background.
 * Gradient: transparent at bottom -> solid at top (theme-aware).
 */
export function GroupGamesHeader(props: GroupGamesHeaderProps) {
  const { onBack, backOnly } = props;
  const leftContent =
    backOnly && "leftContent" in props ? props.leftContent : undefined;
  const rightContent =
    backOnly && "rightContent" in props ? props.rightContent : undefined;
  const { theme, colorScheme } = useTheme();
  const bg = theme.colors.background;
  const transparentBg = bg + "00";
  const gradientColors: [string, string] = [transparentBg, bg];
  const isDark = colorScheme === "dark";
  const blurTint = isDark ? "dark" : "light";
  const buttonBorder = { borderColor: theme.colors.border };

  const RoundBlurButton = ({
    onPress,
    icon,
  }: {
    onPress: () => void;
    icon: React.ReactNode;
  }) => (
    <Pressable onPress={onPress}>
      <View style={[styles.iconButton, styles.iconButtonClip, buttonBorder]}>
        <BlurView
          intensity={50}
          tint={blurTint}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.iconButtonInner}>{icon}</View>
      </View>
    </Pressable>
  );

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0.5, y: 1 }}
      end={{ x: 0.5, y: 0 }}
      style={[
        styles.container,
        Platform.OS === "android" && { elevation: 0 },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.leftRow}>
        <Pressable onPress={onBack}>
          <View style={[styles.iconButton, styles.iconButtonClip, { borderWidth: 0 }]}>
            <BlurView
              intensity={50}
              tint={blurTint}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.iconButtonInner}>
              <Ionicons
                name="chevron-back"
                size={20}
                color={theme.colors.textPrimary}
              />
            </View>
          </View>
        </Pressable>
        {leftContent && leftContent}
      </View>
      {!backOnly ? (
        <View style={styles.rightRow}>
          <RoundBlurButton
            onPress={props.onFillRandom!}
            icon={
              <Ionicons
                name="dice-outline"
                size={20}
                color={theme.colors.textPrimary}
              />
            }
          />
          <RoundBlurButton
            onPress={props.onToggleView!}
            icon={
              <Ionicons
                name={
                  props.viewMode === "list" ? "albums-outline" : "list-outline"
                }
                size={20}
                color={theme.colors.textPrimary}
              />
            }
          />
        </View>
      ) : rightContent ? (
        <View style={styles.rightRow}>{rightContent}</View>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 99,
    borderWidth: 1,
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
  rightRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});
