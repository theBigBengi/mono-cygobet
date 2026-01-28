import React from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { formatDate } from "@/utils/date";

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
  const { theme } = useTheme();

  if (!latestUpdatedAt && !isSaving && savedCount === 0) {
    return null;
  }

  const savedTimeText = latestUpdatedAt
    ? formatDate(latestUpdatedAt.toISOString()) +
      " " +
      latestUpdatedAt.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "";

  return (
    <View style={styles.container}>
      {isSaving ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <AppText variant="caption" color="secondary" style={styles.text}>
            Saving...
          </AppText>
        </View>
      ) : (
        <View style={styles.row}>
          <AppText variant="caption" color="secondary" style={styles.text}>
            {savedCount} of {totalCount} predictions saved
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

