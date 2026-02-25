import React, { useCallback } from "react";
import { View, StyleSheet, TextInput, Pressable, Text } from "react-native";
import * as Haptics from "expo-haptics";
import { formatKickoffTime } from "@/utils/fixture";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { Card } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useEntityTranslation } from "@/lib/i18n/i18n.entities";
import type { GroupPrediction } from "@/features/group-creation/selection/games";
import type { FixtureItem, PositionInGroup } from "@/types/common";
import type { FocusedField, PredictionMode } from "../types";
import { useMatchCardState } from "../hooks/useMatchCardState";
import { getOutcomeFromPrediction } from "../utils/utils";
import { ScoreInput } from "./ScoreInput";
import { OutcomePicker } from "./OutcomePicker";
import { TeamRow } from "./TeamRow";
import { ResultDisplay } from "./ResultDisplay";

type InputRefs = {
  home: React.RefObject<TextInput | null>;
  away: React.RefObject<TextInput | null>;
};

type Props = {
  fixture: FixtureItem;
  prediction: GroupPrediction;
  inputRefs: React.MutableRefObject<Record<string, InputRefs>>;
  positionInGroup: PositionInGroup;
  currentFocusedField: FocusedField;
  isSaved?: boolean;
  isHighlighted?: boolean;
  cardRef?: React.RefObject<View | null> | undefined;
  onFocus: (type: "home" | "away") => void;
  onBlur?: () => void;
  onChange: (type: "home" | "away", nextText: string) => void;
  onAutoNext?: (type: "home" | "away") => void;
  predictionMode?: PredictionMode;
  onSelectOutcome?: (outcome: "home" | "draw" | "away") => void;
  onPressCard?: () => void;
  showLeagueInfo?: boolean;
  matchNumber?: string;
  timelineFilled?: boolean;
  timelineConnectorFilled?: boolean;
  isFirstInTimeline?: boolean;
  isLastInTimeline?: boolean;
  isNextToPredict?: boolean;
  isMaxPoints?: boolean;
};

export function MatchPredictionCardVertical({
  fixture,
  prediction,
  inputRefs,
  positionInGroup,
  currentFocusedField,
  isSaved: _isSaved,
  isHighlighted = false,
  cardRef,
  onFocus,
  onBlur,
  onChange,
  onAutoNext,
  predictionMode = "CorrectScore",
  onSelectOutcome,
  onPressCard: onPressCardProp,
  showLeagueInfo = true,
  matchNumber,
  isNextToPredict = false,
  isMaxPoints = false,
}: Props) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { translateTeam } = useEntityTranslation();
  const { theme } = useTheme();
  const fixtureIdStr = String(fixture.id);

  const onPressCard = useCallback(() => {
    if (onPressCardProp) {
      onPressCardProp();
    } else {
      router.push(`/fixtures/${fixture.id}` as any);
    }
  }, [onPressCardProp, router, fixture.id]);

  const handleHomeChange = useCallback((text: string) => onChange("home", text), [onChange]);
  const handleAwayChange = useCallback((text: string) => onChange("away", text), [onChange]);
  const handleHomeFocus = useCallback(() => onFocus("home"), [onFocus]);
  const handleAwayFocus = useCallback(() => onFocus("away"), [onFocus]);
  const handleHomeAutoNext = useCallback(() => onAutoNext?.("home"), [onAutoNext]);
  const handleAwayAutoNext = useCallback(() => onAutoNext?.("away"), [onAutoNext]);

  if (!inputRefs.current[fixtureIdStr]) {
    inputRefs.current[fixtureIdStr] = {
      home: React.createRef(),
      away: React.createRef(),
    };
  }
  const homeRef = inputRefs.current[fixtureIdStr].home;
  const awayRef = inputRefs.current[fixtureIdStr].away;

  const {
    isEditable,
    isLive,
    isFinished,
    isCancelled,
    gameResultOrTime,
    points,
    isHomeWinner,
    isAwayWinner,
    isHomeFocused,
    isAwayFocused,
    cardRadiusStyle,
    cardBorderStyle,
  } = useMatchCardState({
    fixture,
    positionInGroup,
    currentFocusedField,
  });

  const homeTeamName = translateTeam(fixture.homeTeam?.name, t("common.home"));
  const awayTeamName = translateTeam(fixture.awayTeam?.name, t("common.away"));

  const isCardFocused = isHomeFocused || isAwayFocused;

  const fixturePoints = fixture.prediction?.points ?? 0;
  const hasPoints = fixturePoints > 0;
  const hasPrediction = prediction.home !== null && prediction.away !== null;

  const successColor = "#10B981";
  const missedColor = "#EF4444";

  const predictionSuccess = isFinished ? (isMaxPoints ? "max" as const : hasPoints) : undefined;

  // Left border — between ScoreInput bg and full color
  const resultColor = isMaxPoints ? "#FFB020" + "80" : hasPoints ? "#10B981" + "95" : "#EF4444" + "B0";

  return (
    <View ref={cardRef} style={[styles.outerRow, styles.outerRowSpacing]}>
      <View style={styles.cardShadowWrapper}>
        <Card
          style={[
            styles.matchCard,
            {
              backgroundColor: isHighlighted
                ? theme.colors.primary + "15"
                : theme.colors.cardBackground,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {/* League info row */}
          {showLeagueInfo && (
            <View style={[styles.leagueInfoRow, { backgroundColor: theme.colors.textSecondary + "08" }]}>
              {/* Points tint — right side only */}
              {isFinished && !isCancelled ? (
                <View style={[
                  styles.leagueInfoRightTint,
                  isMaxPoints
                    ? { backgroundColor: "#10B981" + "15" }
                    : hasPoints
                      ? { backgroundColor: "#FFB020" + "20" }
                      : { backgroundColor: "#EF4444" + "12" },
                ]} />
              ) : isLive ? (
                <View style={[
                  styles.leagueInfoRightTint,
                  { backgroundColor: "#EF4444" },
                ]} />
              ) : isNextToPredict ? (
                <View style={[
                  styles.leagueInfoRightTint,
                  { backgroundColor: theme.colors.primary },
                ]} />
              ) : null}
              <View style={styles.leagueInfoLeft}>
                <Text
                  style={[styles.leagueText, { color: theme.colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {fixture.league?.name}
                </Text>
                {(fixture.round || fixture.stage) && (
                  <>
                    <Text style={[styles.separator, { color: theme.colors.textSecondary }]}>•</Text>
                    <Text style={[styles.leagueText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      {fixture.round
                        ? isNaN(Number(fixture.round))
                          ? fixture.round.replace(/^Knockout Round\s*/i, "").replace(/^Round of\s*/i, "R")
                          : `R${fixture.round}`
                        : (fixture.stage ?? "").replace(/^Knockout Round\s*/i, "").replace(/^Round of\s*/i, "R")}
                      {fixture.leg && fixture.leg !== "1/1" ? ` · ${fixture.leg}` : ""}
                    </Text>
                  </>
                )}
              </View>
              {/* Time / Live minute */}
              <Text style={[styles.leagueText, isLive ? { color: "#EF4444", fontWeight: "700" } : { color: theme.colors.textSecondary }]}>
                {isLive ? `${fixture.liveMinute != null ? fixture.liveMinute : 0}′` : formatKickoffTime(fixture.kickoffAt)}
              </Text>
              {/* Divider */}
              <View style={[styles.leagueDivider, { backgroundColor: theme.colors.border }]} />
              {/* Points text */}
              {isFinished && !isCancelled ? (
                <View style={styles.predictionColumn} >
                  <Text style={[
                    styles.pointsText,
                    isMaxPoints
                      ? { color: "#10B981" }
                      : hasPoints
                        ? { color: "#D4920A" }
                        : { color: "#EF4444" },
                  ]}>
                    {hasPoints ? `+${fixturePoints}` : "0"} pts
                  </Text>
                </View>
              ) : isNextToPredict ? (
                <View style={styles.predictionColumn} >
                  <Text style={[styles.pointsText, { color: "#FFFFFF", fontWeight: "700" }]}>NEXT</Text>
                </View>
              ) : isLive ? (
                <View style={styles.predictionColumn} >
                  <Text style={[styles.pointsText, { color: "#FFFFFF", fontWeight: "700" }]}>LIVE</Text>
                </View>
              ) : (
                <View style={styles.predictionColumn} />
              )}
            </View>
          )}

          <View
            style={[
              styles.matchContent,
              isCancelled && { opacity: 0.6 },
            ]}
          >
            {/* Continuous divider spanning both rows */}
            <View style={[styles.continuousDivider, { backgroundColor: theme.colors.border }]} />

            {/* Home Row */}
            <View style={styles.teamRow}>
              <Pressable
                style={styles.matchPressable}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onPressCard();
                }}
              >
                <View style={styles.teamPressable}>
                  <TeamRow
                    team={fixture.homeTeam}
                    teamName={homeTeamName}
                    isWinner={isHomeWinner}
                  />
                </View>
                <ResultDisplay
                  result={gameResultOrTime}
                  isLive={isLive}
                  isFinished={isFinished}
                  isCancelled={isCancelled}
                  isHomeWinner={isHomeWinner}
                  isAwayWinner={isAwayWinner}
                  type="home"
                />
              </Pressable>
              {predictionMode === "MatchWinner" && onSelectOutcome ? null : (
                <View style={styles.predictionColumn} >
                  <ScoreInput
                    type="home"
                    value={prediction.home}
                    isFocused={isHomeFocused}
                    isEditable={isEditable}
                    isFinished={isFinished}
                    inputRef={homeRef}
                    onChange={handleHomeChange}
                    onFocus={handleHomeFocus}
                    onBlur={onBlur}
                    onAutoNext={onAutoNext ? handleHomeAutoNext : undefined}
                    isCorrect={predictionSuccess}
                    isLive={isLive}
                  />
                </View>
              )}
            </View>

            {/* Away Row */}
            <View style={styles.teamRow}>
              <Pressable
                style={styles.matchPressable}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onPressCard();
                }}
              >
                <View style={styles.teamPressable}>
                  <TeamRow
                    team={fixture.awayTeam}
                    teamName={awayTeamName}
                    isWinner={isAwayWinner}
                  />
                </View>
                <ResultDisplay
                  result={gameResultOrTime}
                  isLive={isLive}
                  isFinished={isFinished}
                  isCancelled={isCancelled}
                  isHomeWinner={isHomeWinner}
                  isAwayWinner={isAwayWinner}
                  type="away"
                />
              </Pressable>
              {predictionMode === "MatchWinner" && onSelectOutcome ? null : (
                <View style={styles.predictionColumn} >
                  <ScoreInput
                    type="away"
                    value={prediction.away}
                    isFocused={isAwayFocused}
                    isEditable={isEditable}
                    isFinished={isFinished}
                    inputRef={awayRef}
                    onChange={handleAwayChange}
                    onFocus={handleAwayFocus}
                    onBlur={onBlur}
                    onAutoNext={onAutoNext ? handleAwayAutoNext : undefined}
                    isCorrect={predictionSuccess}
                    isLive={isLive}
                  />
                </View>
              )}
            </View>

            {/* OutcomePicker for MatchWinner mode */}
            {predictionMode === "MatchWinner" && onSelectOutcome && (
              <OutcomePicker
                selectedOutcome={getOutcomeFromPrediction(prediction)}
                isEditable={isEditable}
                onSelect={onSelectOutcome}
              />
            )}
          </View>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerRow: {},
  outerRowSpacing: {
    marginBottom: 12,
  },
  cardShadowWrapper: {
    flex: 1,
    borderRadius: 10,
  },
  cardShadowWrapperPressed: {
    opacity: 0.7,
  },
  matchCard: {
    marginHorizontal: 0,
    marginBottom: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  leagueInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    marginHorizontal: -12,
    marginTop: -10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    overflow: "hidden",
  },
  leagueInfoRightTint: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: 72, // predictionColumn(52) + gap(8) + padding(12)
    borderTopRightRadius: 10,
  },
  leagueInfoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  leagueText: {
    fontSize: 11,
    fontWeight: "500",
    opacity: 0.7,
  },
  separator: {
    fontSize: 11,
    opacity: 0.4,
    marginHorizontal: -3,
  },
  nextChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  nextChipText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  predictionColumn: {
    width: 52,
    alignItems: "center",
  },
  matchContent: {
    flexDirection: "column",
    gap: 6,
  },
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  matchPressable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  teamPressable: {
    flex: 1,
  },
  continuousDivider: {
    position: "absolute",
    width: 1,
    top: 0,
    bottom: 0,
    right: 60, // 52 (predictionColumn) + 8 (gap)
    opacity: 0.5,
  },
  leagueDivider: {
    width: 1,
    alignSelf: "stretch",
    marginVertical: -6, // cancel out leagueInfoRow paddingVertical
    opacity: 0.5,
  },
  pointsText: {
    fontSize: 11,
    fontWeight: "700",
  },
  timeText: {
    fontSize: 11,
    fontWeight: "500",
    opacity: 0.7,
  },
});
