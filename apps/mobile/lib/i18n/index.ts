// lib/i18n/index.ts
// Barrel export for i18n module.

export { I18nBootstrap } from "./I18nBootstrap";
export { I18nProvider, useI18n } from "./I18nProvider";
export type { I18nContextValue } from "./I18nProvider";
export { initI18n, changeLanguage } from "./i18n.config";
export { applyRTL, isRTL } from "./i18n.rtl";
export { useEntityTranslation } from "./i18n.entities";
export {
  getDateFnsLocale,
  formatDateLocale,
  formatDateShortLocale,
  formatTime24Locale,
  formatDateHeaderLocale,
} from "./i18n.date";
export { getPersistedLocale, setPersistedLocale } from "./i18n.storage";
export type { Locale } from "./i18n.types";
export { isLocale, SUPPORTED_LOCALES } from "./i18n.types";
