// lib/i18n/i18n.storage.ts
// AsyncStorage read/write for persisted locale.

import AsyncStorage from "@react-native-async-storage/async-storage";

const LOCALE_KEY = "@locale";

export async function getPersistedLocale(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LOCALE_KEY);
  } catch {
    return null;
  }
}

export async function setPersistedLocale(locale: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LOCALE_KEY, locale);
  } catch {
    // ignore
  }
}

const RTL_RESTART_KEY = "@rtl_restart_pending";

/** Set flag before calling reloadAsync. */
export async function setRTLRestartPending(): Promise<void> {
  try {
    await AsyncStorage.setItem(RTL_RESTART_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** Read and clear the flag. Returns true if a restart was pending. */
export async function consumeRTLRestartPending(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(RTL_RESTART_KEY);
    if (val !== null) {
      await AsyncStorage.removeItem(RTL_RESTART_KEY);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

