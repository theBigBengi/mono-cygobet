import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, { useAnimatedStyle, interpolate, withSpring } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
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
  expandAnim?: SharedValue<number>;
  expandHeight?: number;
  expandedContent?: React.ReactNode;
  isExpanded?: boolean;
  onToggleExpand?: (open: boolean) => void;
}

export function GroupGamesHeader({
  onBack,
  children,
  backOnly,
  rightContent,
  title,
  expandAnim,
  expandHeight = 0,
  expandedContent,
  isExpanded = false,
  onToggleExpand,
}: GroupGamesHeaderProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const hasExpand = !!expandAnim && expandHeight > 0;

  const expandStyle = useAnimatedStyle(() => {
    if (!expandAnim || !expandHeight) return { height: 0, opacity: 0 };
    return {
      height: interpolate(expandAnim.value, [0, 1], [0, expandHeight]),
      opacity: expandAnim.value,
    };
  });

  // Bounce the whole header on close undershoot (height can't go negative)
  const containerBounceStyle = useAnimatedStyle(() => {
    if (!expandAnim || !expandHeight) return {};
    const v = expandAnim.value;
    if (v >= 0) return {};
    return { transform: [{ translateY: v * expandHeight }] };
  });

  const handleToggle = () => {
    if (!expandAnim) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const target = isExpanded ? 0 : 1;
    expandAnim.value = withSpring(target, {
      damping: 12,
      stiffness: 160,
      mass: 0.8,
    });
    onToggleExpand?.(!isExpanded);
  };

  return (
    <Animated.View
      style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.colors.background }, containerBounceStyle]}
      pointerEvents="box-none"
    >
      {/* Expandable section */}
      {hasExpand && (
        <Animated.View style={[styles.expandSection, expandStyle]}>
          {expandedContent}
        </Animated.View>
      )}

      {/* Buttons row */}
      <View style={styles.content}>
        {/* Absolutely centered title — independent of flex items */}
        {!isExpanded && title && (
          <View style={styles.titleOverlay} pointerEvents="none">
            <AppText variant="body" style={styles.title} numberOfLines={1}>{title}</AppText>
          </View>
        )}
        {!isExpanded ? (
          <>
            <Pressable onPress={onBack} style={styles.hudButton}>
              <View style={styles.hudButtonInner}>
                <Ionicons name="chevron-back" size={18} color={theme.colors.textSecondary} />
              </View>
            </Pressable>
            {!backOnly && children && (
              <View style={styles.childrenArea}>{children}</View>
            )}
            {(backOnly || !children) && (
              <View style={styles.spacer} />
            )}
            {hasExpand && (
              <Pressable onPress={handleToggle} style={styles.hudButton}>
                <View style={styles.hudButtonInner}>
                  <Ionicons name="filter" size={18} color={theme.colors.textSecondary} />
                </View>
              </Pressable>
            )}
            {rightContent && (
              <View style={styles.rightContent}>{rightContent}</View>
            )}
          </>
        ) : (
          <Pressable onPress={handleToggle} style={styles.closeButton}>
            <View style={styles.closeButtonInner}>
              <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
            </View>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  expandSection: {
    overflow: "hidden",
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
    backgroundColor: "rgba(0,0,0,0.06)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    borderBottomWidth: 3,
    borderBottomColor: "rgba(0,0,0,0.15)",
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
  closeButton: {
    flex: 1,
    alignItems: "center",
  },
  closeButtonInner: {
    width: 120,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.06)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    borderBottomWidth: 3,
    borderBottomColor: "rgba(0,0,0,0.15)",
  },
});
