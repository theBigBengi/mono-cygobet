import React from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { useTheme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { HEADER_HEIGHT } from "../utils/constants";


interface GroupGamesHeaderFullProps {
  backOnly?: false;
  onBack: () => void;
  onFillRandom: () => void;
}

interface GroupGamesHeaderBackOnlyProps {
  backOnly: true;
  onBack: () => void;
  /** Optional title shown next to back button when no leftContent */
  title?: string;
  /** Optional content to show on the left (after back button, e.g. group name) */
  leftContent?: React.ReactNode;
  /** Optional content to show on the right (e.g. group status) */
  rightContent?: React.ReactNode;
  onFillRandom?: () => void;
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
  const title = backOnly && "title" in props ? props.title : undefined;
  const leftContent =
    backOnly && "leftContent" in props ? props.leftContent : undefined;
  const rightContent =
    backOnly && "rightContent" in props ? props.rightContent : undefined;
  const { theme } = useTheme();

  const showTitle = backOnly && title && !leftContent;

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
      {!backOnly ? (
        <View style={styles.rightRow}>
          <Pressable onPress={props.onFillRandom!}>
            <View style={[styles.iconButton]}>
              <Ionicons
                name="dice-outline"
                size={20}
                color={theme.colors.textPrimary}
              />
            </View>
          </Pressable>
        </View>
      ) : rightContent ? (
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
