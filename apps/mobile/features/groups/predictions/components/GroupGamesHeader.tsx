import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, spacing, radius } from "@/lib/theme";
import { getShadowStyle } from "@/lib/theme/shadows";
import { AppText } from "@/components/ui";
import { Ionicons } from "@expo/vector-icons";
import { HEADER_HEIGHT } from "../utils/constants";

interface GroupGamesHeaderProps {
  onBack: () => void;
  children?: React.ReactNode;
  backOnly?: boolean;
  rightContent?: React.ReactNode;
  title?: string;
  onFilterPress?: () => void;
}

export function GroupGamesHeader({
  onBack,
  children,
  backOnly,
  rightContent,
  title,
  onFilterPress,
}: GroupGamesHeaderProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.colors.surface }]}
      pointerEvents="box-none"
    >
      {/* Buttons row */}
      <View style={styles.content}>
        <Pressable onPress={onBack} style={styles.hudButton}>
          <View style={[styles.hudButtonInner, { backgroundColor: "transparent" }]}>
            <Ionicons name="chevron-back" size={18} color={theme.colors.textPrimary} />
          </View>
        </Pressable>
        {title && (
          <AppText variant="body" style={styles.title} numberOfLines={1}>{title}</AppText>
        )}
        {!backOnly && children && (
          <View style={styles.childrenArea}>{children}</View>
        )}
        {(backOnly || !children) && (
          <View style={styles.spacer} />
        )}
        {onFilterPress && (
          <Pressable onPress={onFilterPress} style={styles.hudButton}>
            <View style={[styles.hudButtonInner, { backgroundColor: "transparent" }]}>
              <Ionicons name="filter" size={18} color={theme.colors.textPrimary} />
            </View>
          </Pressable>
        )}
        {rightContent && (
          <View style={styles.rightContent}>{rightContent}</View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...getShadowStyle("sm"),
  },
  content: {
    height: HEADER_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: radius.sm,
  },
  hudButton: {
    padding: spacing.xs,
  },
  hudButtonInner: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  childrenArea: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
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
