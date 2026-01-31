// lib/i18n/i18n.config.ts
// i18next init with languages, namespaces, fallback.

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import type { Locale } from "./i18n.types";

import enCommon from "@/i18n/locales/en/common.json";
import heCommon from "@/i18n/locales/he/common.json";
import enEntities from "@/i18n/locales/en.json";
import heEntities from "@/i18n/locales/he.json";

const resources = {
  en: {
    common: enCommon as Record<string, unknown>,
    entities: enEntities as Record<string, unknown>,
  },
  he: {
    common: heCommon as Record<string, unknown>,
    entities: heEntities as Record<string, unknown>,
  },
};

export function initI18n(locale: Locale): void {
  void i18n.use(initReactI18next).init({
    resources,
    lng: locale,
    fallbackLng: "en",
    defaultNS: "common",
    ns: ["common", "entities"],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    react: {
      useSuspense: false,
    },
  });
}

export function changeLanguage(locale: Locale): Promise<void> {
  return i18n.changeLanguage(locale).then(() => {});
}
