// lib/i18n/I18nBootstrap.tsx
// Bootstrap: read persisted locale, apply RTL, init i18n, then render children.

import React, { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { View, ActivityIndicator } from "react-native";
import * as Localization from "expo-localization";
import type { Locale } from "./i18n.types";
import { isLocale } from "./i18n.types";
import { applyRTL } from "./i18n.rtl";
import { initI18n } from "./i18n.config";
import { getPersistedLocale } from "./i18n.storage";
import { I18nProvider } from "./I18nProvider";

function getDeviceLocale(): Locale {
  const locales = Localization.getLocales();
  const code = locales[0]?.languageCode ?? "en";
  const tag = code.split("-")[0]?.toLowerCase() ?? "en";
  return isLocale(tag) ? tag : "en";
}

interface I18nBootstrapProps {
  children: ReactNode;
}

export function I18nBootstrap({ children }: I18nBootstrapProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const persisted = await getPersistedLocale();
      const device = getDeviceLocale();
      const locale: Locale = isLocale(persisted ?? "") ? (persisted as Locale) : device;

      if (cancelled) return;

      initI18n(locale);
      applyRTL(locale);
      setReady(true);
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <I18nProvider>{children}</I18nProvider>;
}
