import React from "react";
import { View, StyleSheet, Dimensions, TextInput } from "react-native";
import { Card, AppText, TeamLogo } from "@/components/ui";
import { getTeamDisplayName } from "@/utils/fixture";
import { ScoresInput } from "./ScoresInput";
import type { GroupPrediction } from "@/features/group-creation/selection/games";
import type { FixtureItem } from "@/types/common";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type Props = {
  fixture: FixtureItem;
  prediction: GroupPrediction;
  homeRef: React.RefObject<TextInput | null> | undefined;
  awayRef: React.RefObject<TextInput | null> | undefined;
  homeFocused?: boolean;
  awayFocused?: boolean;
  isSaved?: boolean;
  onFocus: (type: "home" | "away") => void;
  onBlur?: () => void;
  onChange: (type: "home" | "away", nextText: string) => void;
  onAutoNext?: (type: "home" | "away") => void;
};

/**
 * Single game match card - designed specifically for single game view.
 * Horizontal layout: Team Logo + Name | Score | Name + Team Logo
 */
export function SingleGameMatchCard({
  fixture,
  prediction,
  homeRef,
  awayRef,
  homeFocused,
  awayFocused,
  isSaved = false,
  onFocus,
  onBlur,
  onChange,
  onAutoNext,
}: Props) {
  const homeTeamName = getTeamDisplayName(fixture.homeTeam?.name, "Home");
  const awayTeamName = getTeamDisplayName(fixture.awayTeam?.name, "Away");
  const isEditable = fixture.state === "NS";
  const isLive = fixture.state === "LIVE";
  const isFinished = fixture.state === "FT";
  const isCancelled = fixture.state === "CAN" || (fixture.state !== "NS" && fixture.state !== "FT" && fixture.state !== "LIVE");

  // Get result or reason text
  const getResultOrReasonText = (): string | null => {
    // For LIVE and FT games, show result if available
    if ((isLive || isFinished) && fixture.result) {
      // Normalize result format (can be "2-1" or "2:1")
      return fixture.result.replace(":", "-");
    }
    if (isCancelled) {
      // Map state to reason text
      const stateMap: Record<string, string> = {
        CAN: "Cancelled",
        HT: "Half Time",
        INT: "Interrupted",
      };
      return stateMap[fixture.state] || `Status: ${fixture.state}`;
    }
    return null;
  };

  const resultOrReasonText = getResultOrReasonText();

  return (
    <View style={[!isEditable && !isLive && styles.dimmedContainer]}>
      <Card style={styles.matchCard}>
        <View style={styles.matchContent}>
          {/* Home Team - Logo above Name */}
          <View style={styles.teamSection}>
            <TeamLogo
              imagePath={fixture.homeTeam?.imagePath}
              teamName={homeTeamName}
              size={48}
            />
            <AppText variant="body" style={styles.teamName} numberOfLines={2}>
              {homeTeamName}
            </AppText>
          </View>

          {/* Score Inputs Section */}
          <ScoresInput
            prediction={prediction}
            homeRef={homeRef}
            awayRef={awayRef}
            homeFocused={homeFocused}
            awayFocused={awayFocused}
            isSaved={isSaved}
            isEditable={isEditable}
            isLive={isLive}
            onFocus={onFocus}
            onBlur={onBlur}
            onChange={onChange}
            onAutoNext={onAutoNext}
            variant="large"
            containerStyle={styles.scoreSection}
          />

          {/* Away Team - Logo above Name */}
          <View style={styles.teamSectionAway}>
            <TeamLogo
              imagePath={fixture.awayTeam?.imagePath}
              teamName={awayTeamName}
              size={48}
            />
            <AppText variant="body" style={styles.teamNameAway} numberOfLines={2}>
              {awayTeamName}
            </AppText>
          </View>
        </View>
        {resultOrReasonText && (
          <View style={styles.resultContainer}>
            <AppText
              variant="caption"
              color={isLive ? undefined : "secondary"}
              style={[
                styles.resultText,
                isLive && styles.liveResultText,
              ]}
            >
              {resultOrReasonText}
            </AppText>
          </View>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  dimmedContainer: {
    opacity: 0.6,
  },
  matchCard: {
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 16,
    padding: 16,
    borderRadius: 0,
    alignSelf: "center",
    width: SCREEN_WIDTH,
  },
  matchContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  teamSection: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minWidth: 0,
    paddingHorizontal: 4,
  },
  teamSectionAway: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minWidth: 0,
    paddingHorizontal: 4,
  },
  teamName: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    width: "100%",
  },
  teamNameAway: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    width: "100%",
  },
  scoreSection: {
    justifyContent: "center",
    paddingHorizontal: 4,
    flexShrink: 0,
  },
  resultContainer: {
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
  },
  resultText: {
    fontSize: 11,
  },
  liveResultText: {
    color: "#EF4444",
    fontWeight: "700",
  },
});
