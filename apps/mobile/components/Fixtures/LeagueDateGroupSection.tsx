import React from "react";
import { View, StyleSheet } from "react-native";
import { AppText } from "@/components/ui";
import { formatDateHeader } from "@/utils/fixture";

type Props = {
  leagueName: string;
  countryName?: string | null;
  dateKey: string;
  kickoffIso?: string | null;
  children: React.ReactNode;
};

/**
 * Shared wrapper for "League + Date" header sections.
 * Used across screens that group fixtures by league/date.
 */
export function LeagueDateGroupSection({
  leagueName,
  countryName,
  dateKey,
  children,
}: Props) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <AppText
            variant="caption"
            color="secondary"
            style={styles.leagueName}
          >
            {leagueName}
          </AppText>
          {countryName && (
            <AppText
              variant="caption"
              color="secondary"
              style={styles.countryName}
            >
              {countryName}
            </AppText>
          )}
        </View>
        <AppText variant="caption" color="secondary" style={styles.headerText}>
          {formatDateHeader(dateKey)}
        </AppText>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {},
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    // paddingHorizontal: 4,
    // paddingVertical: 8,
    backgroundColor: "transparent",
  },
  headerLeft: {
    flex: 1,
  },
  leagueName: {
    fontSize: 12,
    fontWeight: "400",
  },
  countryName: {
    fontSize: 11,
    marginTop: 2,
  },
  headerText: {
    fontSize: 12,
    fontWeight: "400",
    marginStart: 12,
    opacity: 0.6,
  },
});
