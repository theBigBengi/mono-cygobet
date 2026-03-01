// components/ui/AppHeader.tsx
// Generic app header with back button, optional title, and optional left/right content.

import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Pressable, Animated, Easing } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "./AppText";

const HEADER_HEIGHT = 64;

export interface AppHeaderProps {
  onBack: () => void;
  /** Optional title shown next to back button when no leftContent */
  title?: string;
  /** Optional subtitle shown below the title */
  subtitle?: string;
  /** Show a pulsing live dot next to the subtitle */
  showLiveDot?: boolean;
  /** Optional content to show on the left (after back button) */
  leftContent?: React.ReactNode;
  /** Optional content to show on the right */
  rightContent?: React.ReactNode;
}

export function AppHeader({
  onBack,
  title,
  subtitle,
  showLiveDot,
  leftContent,
  rightContent,
}: AppHeaderProps) {
  const { theme } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!showLiveDot) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [showLiveDot, pulseAnim]);

  const showTitle = title && !leftContent;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          height: HEADER_HEIGHT,
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
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={({ pressed }) => [
            styles.backButton,
            { opacity: pressed ? 0.5 : 1 },
          ]}
        >
          <Ionicons
            name="chevron-back"
            size={28}
            color={theme.colors.textPrimary}
          />
        </Pressable>
        {leftContent ? (
          leftContent
        ) : showTitle ? (
          <View style={styles.titleColumn}>
            <AppText
              variant="subtitle"
              style={[styles.titleText, { color: theme.colors.textPrimary }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {title}
            </AppText>
            {subtitle ? (
              <View style={styles.subtitleRow}>
                {showLiveDot ? (
                  <Animated.View style={[styles.liveDot, { backgroundColor: theme.colors.primary, opacity: pulseAnim }]} />
                ) : null}
                <AppText
                  variant="caption"
                  style={[styles.subtitleText, { color: theme.colors.textSecondary }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {subtitle}
                </AppText>
              </View>
            ) : null}
          </View>
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
    paddingHorizontal: 8,
  },
  backButton: {
    padding: 4,
  },
  leftRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  titleColumn: {
    flex: 1,
  },
  titleText: {
    fontWeight: "600",
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  subtitleText: {
    fontSize: 12,
  },
  rightRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});
