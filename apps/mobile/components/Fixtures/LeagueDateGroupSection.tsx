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
    <View style={[styles.section, { marginBottom: theme.spacing.sm }]}>
      <View
        style={[
          styles.header,
          {
            borderBottomColor: theme.colors.border,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.ms,
            gap: theme.spacing.sm,
          },
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

// Static layout styles — theme-dependent values applied inline via `theme`
const styles = StyleSheet.create({
  section: {},
  header: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  leagueName: {
    flex: 1,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 11,
    fontWeight: "500",
  },
});
