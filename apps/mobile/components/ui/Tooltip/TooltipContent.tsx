// components/ui/Tooltip/TooltipContent.tsx
// Visual presentation component for tooltip with arrow.

import React from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Platform,
  LayoutChangeEvent,
} from "react-native";
import { useTheme } from "@/lib/theme";
import { AppText } from "../AppText";
import type {
  TooltipPlacement,
  TooltipSize,
  TooltipVariant,
} from "./tooltip.types";

const DEFAULT_MAX_HEIGHT = 280;

interface TooltipContentProps {
  content: React.ReactNode;
  placement: TooltipPlacement;
  arrowOffset: number;
  showArrow: boolean;
  maxWidth: number;
  maxHeight?: number;
  variant?: TooltipVariant;
  backgroundColor?: string;
  onLayout: (size: TooltipSize) => void;
  accessibilityLabel?: string;
}

const ARROW_SIZE = 8;

/** Resolves background and text colors from variant (or theme default). */
function getVariantColors(
  theme: { colors: { primary: string; primaryText: string; danger: string; dangerText: string } },
  variant?: TooltipVariant
): { bg: string; text: string } {
  if (variant === "warning") {
    return { bg: theme.colors.danger, text: theme.colors.dangerText };
  }
  return { bg: theme.colors.primary, text: theme.colors.primaryText };
}

/**
 * Renders the tooltip bubble with optional arrow, scrollable content when
 * maxHeight is set, and variant/backgroundColor support.
 */
export function TooltipContent({
  content,
  placement,
  arrowOffset,
  showArrow,
  maxWidth,
  maxHeight = DEFAULT_MAX_HEIGHT,
  variant,
  backgroundColor,
  onLayout,
  accessibilityLabel,
}: TooltipContentProps) {
  const { theme } = useTheme();
  const { bg: variantBg, text: variantText } = getVariantColors(theme, variant);
  const bgColor = backgroundColor ?? variantBg;

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    onLayout({ width, height });
  };

  const isStringContent = typeof content === "string";

  // Arrow positioning based on placement
  const getArrowStyle = () => {
    const baseArrowStyle = {
      position: "absolute" as const,
      width: ARROW_SIZE,
      height: ARROW_SIZE,
      backgroundColor: bgColor,
      transform: [{ rotate: "45deg" }],
    };

    switch (placement) {
      case "top":
        return {
          ...baseArrowStyle,
          bottom: -ARROW_SIZE / 2,
          left: arrowOffset - ARROW_SIZE / 2,
        };
      case "bottom":
        return {
          ...baseArrowStyle,
          top: -ARROW_SIZE / 2,
          left: arrowOffset - ARROW_SIZE / 2,
        };
      case "left":
        return {
          ...baseArrowStyle,
          right: -ARROW_SIZE / 2,
          top: arrowOffset - ARROW_SIZE / 2,
        };
      case "right":
        return {
          ...baseArrowStyle,
          left: -ARROW_SIZE / 2,
          top: arrowOffset - ARROW_SIZE / 2,
        };
    }
  };

  const containerStyle = [
    styles.container,
    {
      backgroundColor: bgColor,
      borderRadius: theme.radius.sm,
      padding: theme.spacing.sm,
      maxWidth,
      maxHeight,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
        },
        android: {
          elevation: 4,
        },
      }),
    },
  ];

  const innerContent = isStringContent ? (
    <AppText variant="caption" style={{ color: variantText }}>
      {content}
    </AppText>
  ) : (
    content
  );

  return (
    <View
      style={containerStyle}
      onLayout={handleLayout}
      accessibilityRole="none"
      accessibilityLabel={accessibilityLabel}
      accessibilityLiveRegion="polite"
    >
      <ScrollView
        style={[styles.scroll, { maxHeight }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        {innerContent}
      </ScrollView>

      {showArrow && <View style={getArrowStyle()} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  scroll: {
    overflow: "scroll",
  },
  scrollContent: {
    flexGrow: 1,
  },
});
