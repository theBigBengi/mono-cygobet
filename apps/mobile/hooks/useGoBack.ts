// hooks/useGoBack.ts
// Centralized back navigation with fallback when no history exists.
// Use when router.canGoBack() is unreliable (e.g. deep links, refresh on iOS).

import { useCallback } from "react";
import { useRouter } from "expo-router";

/**
 * Returns a function that goes back when history exists, otherwise replaces to fallback route.
 * @param fallbackRoute - Route to navigate to when there is no history (default: "/(tabs)/groups")
 */
export function useGoBack(fallbackRoute = "/(tabs)/groups") {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackRoute as any);
    }
  }, [router, fallbackRoute]);
}
