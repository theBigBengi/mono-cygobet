import React from "react";
import { View, StyleSheet } from "react-native";
import { AppText } from "@/components/ui";
import { formatKickoffDateTime } from "@/utils/fixture";

type Props = {
  leagueName?: string | null;
  round?: string | number | null;
  kickoffAt?: string | null;
};

export const FixtureInfoHeader = React.memo(function FixtureInfoHeader({
  leagueName,
  round,
  kickoffAt,
}: Props) {
  return (
    <View style={styles.fixtureInfo}>
      <AppText
        variant="caption"
        color="secondary"
        style={styles.leagueText}
        numberOfLines={1}
      >
        {[leagueName, round ? `Round ${round}` : null]
          .filter(Boolean)
          .join("  ·  ")}
      </AppText>
      {kickoffAt && (
        <AppText
          variant="caption"
          color="secondary"
          style={styles.kickoffText}
          numberOfLines={1}
        >
          {formatKickoffDateTime(kickoffAt)}
        </AppText>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  fixtureInfo: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 12,
    // backgroundColor: "rgba(255,0,255,0.4)", // DEBUG MAGENTA — fixture info above track
  },
  leagueText: {
    fontSize: 12,
    textAlign: "center",
  },
  kickoffText: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 2,
  },
});
