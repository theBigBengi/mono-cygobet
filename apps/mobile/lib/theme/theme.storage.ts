// lib/theme/theme.storage.ts
// AsyncStorage read/write for persisted theme mode.

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ThemeMode } from "./theme.types";

const THEME_MODE_KEY = "@theme_mode";

export async function getPersistedThemeMode(): Promise<ThemeMode | null> {
  try {
    const value = await AsyncStorage.getItem(THEME_MODE_KEY);
    if (value === "light" || value === "dark" || value === "system") {
      return value;
    }
    return null;
  } catch {
    return null;
  }
}

export async function setPersistedThemeMode(mode: ThemeMode): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_MODE_KEY, mode);
  } catch {
    // ignore
  }
}
