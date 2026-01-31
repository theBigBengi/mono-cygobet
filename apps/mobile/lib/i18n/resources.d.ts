// lib/i18n/resources.d.ts
// TS declarations for translation key autocomplete.

import "i18next";
import type enCommon from "@/i18n/locales/en/common.json";
import type enEntities from "@/i18n/locales/en.json";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: {
      common: typeof enCommon;
      entities: typeof enEntities;
    };
  }
}
