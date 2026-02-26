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
      <View
        style={[
          styles.header,
          { borderBottomColor: theme.colors.border },
        ]}
      >
        {leagueImagePath && (
          <TeamLogo
            imagePath={leagueImagePath}
            teamName={leagueName}
            size={20}
          />
        )}
        <AppText
          variant="caption"
          style={[styles.leagueName, { color: theme.colors.textSecondary }]}
          numberOfLines={1}
        >
          {leagueName}
        </AppText>
        {dateKey && (
          <AppText
            variant="caption"
            color="secondary"
            style={styles.dateText}
            numberOfLines={1}
          >
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  leagueName: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 11,
    fontWeight: "500",
  },
});
