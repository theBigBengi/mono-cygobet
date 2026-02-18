import React from "react";
import { View, StyleSheet } from "react-native";
import { AppText, TeamLogo } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { formatDateHeader } from "@/utils/fixture";

type Props = {
  leagueName: string;
  countryName?: string | null;
  leagueImagePath?: string | null;
  dateKey?: string | null;
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
  leagueImagePath,
  dateKey,
  children,
}: Props) {
  const { theme } = useTheme();

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        {leagueImagePath && (
          <View style={styles.logoContainer}>
            <TeamLogo
              imagePath={leagueImagePath}
              teamName={leagueName}
              size={20}
            />
          </View>
        )}
        <View style={styles.headerLeft}>
          <AppText
            variant="caption"
            style={[styles.leagueName, { color: theme.colors.textPrimary }]}
            numberOfLines={1}
          >
            {leagueName}
          </AppText>
          {countryName && (
            <AppText
              variant="caption"
              color="secondary"
              style={styles.countryName}
              numberOfLines={1}
            >
              {countryName}
            </AppText>
          )}
        </View>
        {dateKey && (
          <AppText variant="caption" color="secondary" style={styles.headerText}>
            {formatDateHeader(dateKey)}
          </AppText>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  logoContainer: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.03)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerLeft: {
    flex: 1,
  },
  leagueName: {
    fontSize: 13,
    fontWeight: "600",
  },
  countryName: {
    fontSize: 11,
    marginTop: 1,
  },
  headerText: {
    fontSize: 11,
    fontWeight: "500",
    opacity: 0.7,
  },
});
