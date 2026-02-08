// lib/i18n/i18n.entities.ts
// Entity translation helper (leagues, countries, teams).

import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { i18n as I18nType } from "i18next";

function toEntityKey(name: string): string {
  return name
    .normalize("NFD")                 // decompose diacritics (é → e + combining accent)
    .replace(/[\u0300-\u036f]/g, "")  // strip combining diacritical marks
    .replace(/ø/g, "o")              // handle special Nordic chars
    .replace(/æ/g, "ae")
    .replace(/ß/g, "ss")
    .replace(/ł/g, "l")
    .replace(/đ/g, "d")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_");
}

export function useEntityTranslation() {
  const { t, i18n } = useTranslation(["entities"]);

  const translateLeague = useCallback(
    (apiName: string | null | undefined, fallback = "Unknown league"): string => {
      if (!apiName?.trim()) return fallback;
      const key = toEntityKey(apiName);
      const translated = t(`leagues.${key}`, { defaultValue: apiName });
      return translated !== `leagues.${key}` ? translated : apiName;
    },
    [t]
  );

  const translateTeam = useCallback(
    (apiName: string | null | undefined, fallback: string = "Home"): string => {
      if (!apiName?.trim()) return fallback;
      const key = toEntityKey(apiName);
      const translated = t(`teams.${key}`, { defaultValue: apiName });
      return translated !== `teams.${key}` ? translated : apiName;
    },
    [t]
  );

  const translateCountry = useCallback(
    (apiName: string | null | undefined, fallback = "Unknown"): string => {
      if (!apiName?.trim()) return fallback;
      const key = toEntityKey(apiName);
      const translated = t(`countries.${key}`, { defaultValue: apiName });
      return translated !== `countries.${key}` ? translated : apiName;
    },
    [t]
  );

  return { translateLeague, translateTeam, translateCountry };
}
