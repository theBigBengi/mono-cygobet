import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Dimensions, TextInput } from "react-native";
import {
  isEditable as isEditableState,
  isLive as isLiveState,
  isFinished as isFinishedState,
  isCancelled as isCancelledState,
} from "@repo/utils";
import { Card, AppText, TeamLogo } from "@/components/ui";
import { useEntityTranslation } from "@/lib/i18n/i18n.entities";
import { ScoresInput } from "./ScoresInput";
import { OutcomePicker } from "./OutcomePicker";
import type { GroupPrediction } from "@/features/group-creation/selection/games";
import type { FixtureItem } from "@/types/common";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function getOutcomeFromPrediction(
  prediction: GroupPrediction
): "home" | "draw" | "away" | null {
  if (prediction.home === null || prediction.away === null) return null;
  if (prediction.home > prediction.away) return "home";
  if (prediction.home < prediction.away) return "away";
  return "draw";
}

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
  predictionMode?: "CorrectScore" | "MatchWinner";
  onSelectOutcome?: (outcome: "home" | "draw" | "away") => void;
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
  predictionMode = "CorrectScore",
  onSelectOutcome,
}: Props) {
  const { t } = useTranslation("common");
  const { translateTeam } = useEntityTranslation();
  const homeTeamName = translateTeam(fixture.homeTeam?.name, t("common.home"));
  const awayTeamName = translateTeam(fixture.awayTeam?.name, t("common.away"));
  const isEditable = isEditableState(fixture.state);
  const isLive = isLiveState(fixture.state);
  const isFinished = isFinishedState(fixture.state);
  const isCancelled = isCancelledState(fixture.state);

  // Get result or reason text
  const getResultOrReasonText = (): string | null => {
    // For LIVE and FT games, show result if available
    if ((isLive || isFinished) && fixture.result) {
      // Normalize result format (can be "2-1" or "2:1")
      return fixture.result.replace(":", "-");
    }
    if (isCancelled) {
      const stateMap: Record<string, string> = {
        CAN: t("predictions.cancelled"),
        HT: t("predictions.halfTime"),
        INT: t("predictions.interrupted"),
      };
      return stateMap[fixture.state] || `${t("common.unknown")}: ${fixture.state}`;
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

          {/* Score Inputs or Outcome Picker Section */}
          {predictionMode === "MatchWinner" && onSelectOutcome ? (
            <View style={styles.scoreSection}>
              <OutcomePicker
                selectedOutcome={getOutcomeFromPrediction(prediction)}
                isEditable={isEditable}
                onSelect={onSelectOutcome}
              />
            </View>
          ) : (
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
          )}

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
    direction: "ltr",
    paddingHorizontal: 4,
    flexShrink: 0,
  },
  resultContainer: {
    alignItems: "center",
    direction: "ltr",
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
