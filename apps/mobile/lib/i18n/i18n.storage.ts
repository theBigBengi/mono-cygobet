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

