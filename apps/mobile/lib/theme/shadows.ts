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
  sm: shadow(1, 2, 0.08, 2),
  /** Dropdowns, popovers */
  md: shadow(2, 6, 0.12, 4),
  /** Floating elements, FABs */
  lg: shadow(4, 12, 0.15, 8),
  /** Modals, overlays */
  xl: shadow(8, 24, 0.2, 16),
} as const;

/** Helper: get platform-specific shadow style */
export function getShadowStyle(level: keyof typeof shadows): ViewStyle {
  const s = shadows[level];
  return Platform.OS === "ios" ? s.ios : s.android;
}
