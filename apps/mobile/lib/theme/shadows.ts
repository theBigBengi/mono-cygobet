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
  /** Cards, buttons — subtle lift */
  sm: shadow(1, 3, 0.06, 2),
  /** Dropdowns, popovers — refined depth */
  md: shadow(2, 8, 0.08, 4),
  /** Floating elements, FABs — prominent */
  lg: shadow(4, 16, 0.12, 8),
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
