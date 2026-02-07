// lib/settings/settings.storage.ts
// AsyncStorage read/write for haptics preference.

import AsyncStorage from "@react-native-async-storage/async-storage";

const HAPTICS_ENABLED_KEY = "@haptics_enabled";

export async function getHapticsEnabled(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(HAPTICS_ENABLED_KEY);
    // Default to true if not set
    return value !== "false";
  } catch {
    return true;
  }
}

export async function setHapticsEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(HAPTICS_ENABLED_KEY, enabled ? "true" : "false");
  } catch {
    // ignore
  }
}
