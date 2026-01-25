// components/ui/TeamLogo.tsx
// Shared TeamLogo component for displaying team logos.
// - Shows team logo image if available, otherwise shows placeholder with first letter.
// - Supports custom size.

import React from "react";
import { View, Image, ImageStyle, ViewStyle, StyleSheet } from "react-native";
import { useTheme } from "@/lib/theme";
import { AppText } from "./AppText";

interface TeamLogoProps {
  /**
   * URL path to the team logo image.
   * If not provided, shows placeholder with first letter of team name.
   */
  imagePath?: string | null;
  /**
   * Team name (used for placeholder fallback).
   * Required for placeholder display.
   */
  teamName: string;
  /**
   * Size of the logo in pixels.
   * Default: 32
   */
  size?: number;
  /**
   * Additional style for the logo container.
   */
  style?: ViewStyle | ImageStyle;
}

/**
 * TeamLogo component - displays team logo or placeholder.
 * 
 * @example
 * <TeamLogo imagePath={team.imagePath} teamName="Arsenal" size={56} />
 */
export function TeamLogo({
  imagePath,
  teamName,
  size = 32,
  style,
}: TeamLogoProps) {
  const { theme } = useTheme();
  const borderRadius = size / 2;

  if (imagePath) {
    return (
      <Image
        source={{ uri: imagePath }}
        style={[
          {
            width: size,
            height: size,
            borderRadius,
          },
          style,
        ]}
        resizeMode="contain"
      />
    );
  }

  // Placeholder circle with first letter
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: theme.colors.border,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <AppText variant="caption" color="secondary">
        {teamName.charAt(0).toUpperCase()}
      </AppText>
    </View>
  );
}
