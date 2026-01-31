import React from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { formatDate } from "@/utils/date";
import { formatTime24Locale } from "@/lib/i18n/i18n.date";
import i18n from "i18next";
import type { Locale } from "@/lib/i18n/i18n.types";
import { isLocale } from "@/lib/i18n/i18n.types";

function getCurrentLocale(): Locale {
  const lang = i18n.language?.split("-")[0]?.toLowerCase() ?? "en";
  return isLocale(lang) ? lang : "en";
}

type Props = {
  latestUpdatedAt: Date | null;
  isSaving: boolean;
  savedCount: number;
  totalCount: number;
};

/**
 * Small presentational component for the \"Last saved\" footer.
 */
export function GroupGamesLastSavedFooter({
  latestUpdatedAt,
  isSaving,
  savedCount,
  totalCount,
}: Props) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const locale = getCurrentLocale();

  if (!latestUpdatedAt && !isSaving && savedCount === 0) {
    return null;
  }

  const savedTimeText = latestUpdatedAt
    ? formatDate(latestUpdatedAt.toISOString()) +
      " " +
      formatTime24Locale(latestUpdatedAt, locale)
    : "";

  return (
    <View style={styles.container}>
      {isSaving ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <AppText variant="caption" color="secondary" style={styles.text}>
            {t("predictions.saving")}
          </AppText>
        </View>
      ) : (
        <View style={styles.row}>
          <AppText variant="caption" color="secondary" style={styles.text}>
            {t("predictions.saved", { count: savedCount, total: totalCount })}
          </AppText>
          {savedTimeText ? (
            <AppText variant="caption" color="secondary" style={styles.text}>
            {savedTimeText}
            </AppText>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    alignItems: "flex-start",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  text: {
    fontSize: 11,
  },
});

