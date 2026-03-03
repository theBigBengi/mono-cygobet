import React from "react";
import { View, StyleSheet } from "react-native";
import { TeamLogo, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { formatKickoffDateTime } from "@/utils/fixture";
import type { FixtureItem } from "@/types/common";

export type NextCardPeekProps = {
  fixture: FixtureItem;
};

export const NextCardPeek = React.memo(function NextCardPeek({
  fixture,
}: NextCardPeekProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.cardBackground,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.team}>
          <TeamLogo
            imagePath={fixture.homeTeam?.imagePath}
            teamName={fixture.homeTeam?.name ?? ""}
            size={28}
            rounded={false}
          />
          <AppText variant="caption" numberOfLines={1} style={styles.teamName}>
            {fixture.homeTeam?.name ?? "Home"}
          </AppText>
        </View>
        <View style={styles.center}>
          <AppText variant="caption" color="secondary" style={styles.vs}>
            vs
          </AppText>
          {fixture.kickoffAt && (
            <AppText variant="caption" color="secondary" style={styles.time}>
              {formatKickoffDateTime(fixture.kickoffAt)}
            </AppText>
          )}
        </View>
        <View style={styles.team}>
          <TeamLogo
            imagePath={fixture.awayTeam?.imagePath}
            teamName={fixture.awayTeam?.name ?? ""}
            size={28}
            rounded={false}
          />
          <AppText variant="caption" numberOfLines={1} style={styles.teamName}>
            {fixture.awayTeam?.name ?? "Away"}
          </AppText>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
    marginHorizontal: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  team: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  teamName: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  center: {
    alignItems: "center",
    paddingHorizontal: 8,
  },
  vs: {
    fontSize: 12,
    fontWeight: "700",
  },
  time: {
    fontSize: 10,
    marginTop: 2,
  },
});
