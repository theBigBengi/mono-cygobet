// lib/i18n/i18n.types.ts
// Locale type and i18n context value type.

export type Locale = "en" | "he";

export const SUPPORTED_LOCALES: readonly Locale[] = ["en", "he"] as const;

export function isLocale(value: string): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}
