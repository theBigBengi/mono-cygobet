// lib/i18n/I18nProvider.tsx
// Context provider + useI18n() hook (mirrors ThemeProvider).

import React, {
  createContext,
  useContext,
  useMemo,
} from "react";
import type { ReactNode } from "react";
import { Alert } from "react-native";
import { useTranslation } from "react-i18next";
import * as Updates from "expo-updates";
import type { Locale } from "./i18n.types";
import { isRTL } from "./i18n.rtl";
import { changeLanguage } from "./i18n.config";
import { setPersistedLocale, setRTLRestartPending } from "./i18n.storage";
import { applyRTL } from "./i18n.rtl";

export interface I18nContextValue {
  locale: Locale;
  isRTL: boolean;
  setLocale: (nextLocale: Locale) => Promise<void>;
}

const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const { i18n, t } = useTranslation();
  const locale = (i18n.language?.split("-")[0] ?? "en") as Locale;

  const setLocale = useMemo(
    () => async (nextLocale: Locale) => {
      if (nextLocale === locale) return;

      const rtlChanged = isRTL(nextLocale) !== isRTL(locale);

      await setPersistedLocale(nextLocale);
      await changeLanguage(nextLocale);

      if (rtlChanged) {
        applyRTL(nextLocale);
        if (__DEV__) {
          Alert.alert(
            t("common.restartRequired"),
            t("common.restartRequiredMessage"),
          );
          return;
        }
        await setRTLRestartPending();
        await Updates.reloadAsync();
        return; // won't reach here, app restarts
      }
    },
    [locale, t]
  );

  const value: I18nContextValue = useMemo(
    () => ({
      locale,
      isRTL: isRTL(locale),
      setLocale,
    }),
    [locale, setLocale]
  );

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
