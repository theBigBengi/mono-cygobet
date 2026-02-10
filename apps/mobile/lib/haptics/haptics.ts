// lib/haptics/haptics.ts
// Centralized haptic utility that respects user preference.

import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { getHapticsEnabled } from "@/lib/settings";

let cachedHapticsEnabled: boolean | null = null;

/** Initialize on app start so cache is set before any haptic. */
export async function initHaptics(): Promise<void> {
  cachedHapticsEnabled = await getHapticsEnabled();
}

/** Update cache when setting changes. */
export function updateHapticsCache(enabled: boolean): void {
  cachedHapticsEnabled = enabled;
}

export async function triggerImpact(
  style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light
): Promise<void> {
  const enabled = cachedHapticsEnabled ?? true;
  if (!enabled) return;

  await Haptics.impactAsync(style);
}

export async function triggerSelection(): Promise<void> {
  const enabled = cachedHapticsEnabled ?? true;
  if (!enabled) return;

  await Haptics.selectionAsync();
}

export async function triggerNotification(
  type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType
    .Success
): Promise<void> {
  const enabled = cachedHapticsEnabled ?? true;
  if (!enabled) return;

  await Haptics.notificationAsync(type);
}
