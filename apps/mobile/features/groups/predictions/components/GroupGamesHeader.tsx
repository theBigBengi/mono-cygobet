import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme";
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
        {/* Absolutely centered title — independent of flex items */}
        {title && (
          <View style={styles.titleOverlay} pointerEvents="none">
            <AppText variant="body" style={styles.title} numberOfLines={1}>{title}</AppText>
          </View>
        )}
        <Pressable onPress={onBack} style={styles.hudButton}>
          <View style={[styles.hudButtonInner, { backgroundColor: "transparent" }]}>
            <Ionicons name="chevron-back" size={18} color={theme.colors.textPrimary} />
          </View>
        </Pressable>
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  content: {
    height: HEADER_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  hudButton: {
    padding: 4,
  },
  hudButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  childrenArea: {
    flex: 1,
  },
  titleOverlay: {
    position: "absolute",
    left: 60,
    right: 60,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  spacer: {
    flex: 1,
  },
  rightContent: {
    flexDirection: "row",
    alignItems: "center",
  },
});
