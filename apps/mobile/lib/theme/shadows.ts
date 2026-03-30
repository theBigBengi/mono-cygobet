// lib/theme/shadows.ts
// Shadow tokens for iOS and Android.
// Helper for platform-specific shadow style.

import { Platform, ViewStyle } from "react-native";

type ShadowLevel = {
  ios: Pick<
    ViewStyle,
    "shadowColor" | "shadowOffset" | "shadowOpacity" | "shadowRadius"
  >;
  android: Pick<ViewStyle, "elevation">;
};

function shadow(
  offsetY: number,
  radius: number,
  opacity: number,
  elevation: number
): ShadowLevel {
  return {
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    android: { elevation },
  };
}

export const shadows = {
  /** Cards, buttons — visible float */
  sm: shadow(3, 10, 0.12, 4),
  /** Dropdowns, popovers — clear depth */
  md: shadow(6, 16, 0.15, 6),
  /** Floating elements, FABs — prominent */
  lg: shadow(8, 24, 0.18, 10),
  /** Modals, overlays — heavy */
  xl: shadow(8, 32, 0.16, 16),
} as const;

/** Helper: get platform-specific shadow style */
export function getShadowStyle(level: keyof typeof shadows): ViewStyle {
  const s = shadows[level];
  return Platform.OS === "ios" ? s.ios : s.android;
}

/**
 * Platform-adjusted bottom border width for 3D card effect.
 * iOS renders 3px well; Android looks better with 2px.
 */
export const CARD_BORDER_BOTTOM_WIDTH = Platform.OS === "ios" ? 3 : 2;
