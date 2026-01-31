// lib/i18n/i18n.entities.ts
// Entity translation helper (leagues, countries, teams).

import { useCallback } from "react";
import { useTranslation } from "react-i18next";

function toEntityKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_");
}

export function useEntityTranslation() {
  const { t } = useTranslation(["entities"]);

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
