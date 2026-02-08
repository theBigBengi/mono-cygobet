// lib/i18n/i18n.rtl.ts
// I18nManager.forceRTL / allowRTL for Hebrew RTL support.
// Note: RTL change requires full app restart (kill + reopen) - reloadAsync only reloads JS, not native.

import { I18nManager } from "react-native";
import type { Locale } from "./i18n.types";

const RTL_LOCALES: Locale[] = ["he"];

export function isRTL(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}

/**
 * Apply RTL layout based on locale.
 * This only calls I18nManager.forceRTL/allowRTL. The actual restart is
 * handled by the caller (I18nProvider) which uses Updates.reloadAsync()
 * in production or shows a restart prompt in dev.
 */
export function applyRTL(locale: Locale): void {
  const rtl = isRTL(locale);

  if (I18nManager.isRTL === rtl) {
    return;
  }

  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
}
