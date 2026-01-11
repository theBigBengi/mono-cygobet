// src/app-shell/appbar/appBar.utils.ts
// Small utility helpers for AppBar.
// No business logic, only pure functions.

import type { AppBarStyleOverrides } from "./AppBar.types";

/**
 * Allowed style override keys (whitelist).
 * Used for runtime validation.
 */
const ALLOWED_OVERRIDE_KEYS: (keyof AppBarStyleOverrides)[] = [
  "backgroundColor",
  "borderBottomWidth",
  "borderBottomColor",
  "height",
];

/**
 * Validate style overrides at runtime.
 * Rejects unknown keys to prevent arbitrary style dumping.
 *
 * @param overrides - Style overrides to validate
 * @throws Error if unknown keys are found
 */
export function validateStyleOverrides(overrides: AppBarStyleOverrides): void {
  const unknownKeys = Object.keys(overrides).filter(
    (key) => !ALLOWED_OVERRIDE_KEYS.includes(key as keyof AppBarStyleOverrides)
  );

  if (unknownKeys.length > 0) {
    throw new Error(
      `Invalid AppBar style override keys: ${unknownKeys.join(", ")}. ` +
        `Allowed keys: ${ALLOWED_OVERRIDE_KEYS.join(", ")}`
    );
  }
}

/**
 * Merge style overrides with preset styles.
 * Applies only whitelisted overrides.
 * Validates overrides at runtime.
 */
export function mergeStyleOverrides(
  presetStyles: Record<string, any>,
  overrides?: AppBarStyleOverrides
): Record<string, any> {
  if (!overrides) {
    return presetStyles;
  }

  // Validate overrides at runtime
  validateStyleOverrides(overrides);

  return {
    ...presetStyles,
    ...(overrides.backgroundColor !== undefined && {
      backgroundColor: overrides.backgroundColor,
    }),
    ...(overrides.borderBottomWidth !== undefined && {
      borderBottomWidth: overrides.borderBottomWidth,
    }),
    ...(overrides.borderBottomColor !== undefined && {
      borderBottomColor: overrides.borderBottomColor,
    }),
    ...(overrides.height !== undefined && {
      height: overrides.height,
    }),
  };
}

/**
 * Check if current route is a modal (for default AppBar visibility policy).
 * In Expo Router, modals can be:
 * - Routes with presentation: "modal" in their Stack.Screen config
 * - Routes in a (modal) route group
 * - Routes with "modal" as a segment
 *
 * ROUTE GROUP DETECTION:
 * - Expo Router route groups appear as segments with or without parentheses
 * - For example, "(modal)" route group appears as ["modal"] or ["(modal)"] in segments
 * - This function checks both patterns for stability
 */
export function isModalRoute(segments: string | string[]): boolean {
  const segmentsArray = Array.isArray(segments) ? segments : [segments];

  if (segmentsArray.length === 0) {
    return false;
  }

  // Check if any segment matches modal patterns
  // Route groups can appear as "modal" or "(modal)" in segments
  return segmentsArray.some(
    (seg) =>
      seg === "modal" ||
      seg === "(modal)" ||
      seg.includes("modal") ||
      seg.includes("(modal)")
  );
}

/**
 * Check if current route is an auth route.
 * Auth routes should not show AppBar or Tabs.
 *
 * ROUTE GROUP DETECTION:
 * - Routes in (auth) group appear as segments starting with "auth" or "(auth)"
 * - Check first segment for route group, and all segments for route group indicators
 */
export function isAuthRoute(segments: string | string[]): boolean {
  const segmentsArray = Array.isArray(segments) ? segments : [segments];

  if (segmentsArray.length === 0) {
    return false;
  }

  const firstSegment = segmentsArray[0];

  // Check if first segment is (auth) route group
  // Route groups can appear as "auth" or "(auth)" in segments
  if (
    firstSegment === "auth" ||
    firstSegment === "(auth)" ||
    firstSegment.startsWith("(auth)")
  ) {
    return true;
  }

  // Check if any segment contains auth route group indicator
  return segmentsArray.some(
    (seg) => seg.includes("(auth)") || (seg === "auth" && seg !== firstSegment)
  );
}

/**
 * Check if current route is an onboarding route.
 * Onboarding routes should not show AppBar or Tabs.
 *
 * ROUTE GROUP DETECTION:
 * - Routes in (onboarding) group appear as segments starting with "onboarding" or "(onboarding)"
 */
export function isOnboardingRoute(segments: string | string[]): boolean {
  const segmentsArray = Array.isArray(segments) ? segments : [segments];

  if (segmentsArray.length === 0) {
    return false;
  }

  const firstSegment = segmentsArray[0];

  // Check if first segment is (onboarding) route group
  // Route groups can appear as "onboarding" or "(onboarding)" in segments
  if (
    firstSegment === "onboarding" ||
    firstSegment === "(onboarding)" ||
    firstSegment.startsWith("(onboarding)")
  ) {
    return true;
  }

  // Check if any segment contains onboarding route group indicator
  return segmentsArray.some(
    (seg) =>
      seg.includes("(onboarding)") ||
      (seg === "onboarding" && seg !== firstSegment)
  );
}

/**
 * Check if current route should hide shell UI (AppBar + Tabs).
 * Returns true for: auth, onboarding, modal routes.
 *
 * Uses pathname for reliable route detection (pathname is more stable than segments).
 * Falls back to segments if pathname is not available.
 */
export function shouldHideShellUI(
  segments: string | string[],
  pathname?: string
): boolean {
  // If pathname is available, use it for more reliable detection
  if (pathname) {
    // Check pathname patterns directly (more reliable than segments)
    if (
      pathname.startsWith("/(auth)") ||
      pathname.includes("/(auth)/") ||
      pathname.startsWith("/auth")
    ) {
      return true;
    }
    if (
      pathname.startsWith("/(onboarding)") ||
      pathname.includes("/(onboarding)/") ||
      pathname.startsWith("/onboarding")
    ) {
      return true;
    }
    if (
      pathname.includes("/modal") ||
      pathname.startsWith("/modal") ||
      pathname.includes("(modal)")
    ) {
      return true;
    }
  }

  // Fallback to segments-based detection
  return (
    isAuthRoute(segments) ||
    isOnboardingRoute(segments) ||
    isModalRoute(segments)
  );
}
