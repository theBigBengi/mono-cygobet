import React, { useCallback } from "react";
import { View, StyleSheet, TextInput, Pressable, Text, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { formatKickoffTime } from "@/utils/fixture";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { useTheme, CARD_BORDER_BOTTOM_WIDTH } from "@/lib/theme";
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
  hideLeagueName?: boolean;
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
  hideLeagueName = false,
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

  const predictionSuccess = isFinished ? (isMaxPoints ? "max" as const : hasPoints) : undefined;

  const isConnected = positionInGroup === "middle" || positionInGroup === "bottom";
  const hasThickBottom = positionInGroup === "bottom" || positionInGroup === "single";

  return (
    <View ref={cardRef} style={[styles.outerRow, !isConnected && positionInGroup !== "top" && styles.outerRowSpacing]}>
      <View style={styles.cardShadowWrapper}>
        <View
          style={[
            styles.matchCard,
            cardRadiusStyle,
            isConnected && styles.cardConnected,
            hasThickBottom && styles.cardWithBottomBorder,
            {
              backgroundColor: isHighlighted
                ? theme.colors.primary + "08"
                : theme.colors.background,
              borderColor: "transparent",
              borderBottomColor: "transparent",
              ...(Platform.OS === "android" && positionInGroup !== "single"
                ? { elevation: 0 }
                : {}),
            },
          ]}
        >
          {/* Debug: purple line for league info */}
          {showLeagueInfo && (
            <View style={styles.leagueInfoRow}>
              <Text
                style={[styles.leagueText, { color: theme.colors.textSecondary }]}
                numberOfLines={1}
              >
                {!hideLeagueName ? fixture.league?.name : ""}
                {(fixture.round || fixture.stage) ? `${!hideLeagueName ? " · " : ""}${
                  fixture.round
                    ? isNaN(Number(fixture.round))
                      ? fixture.round.replace(/^Knockout Round\s*/i, "").replace(/^Round of\s*/i, "R")
                      : `R${fixture.round}`
                    : (fixture.stage ?? "").replace(/^Knockout Round\s*/i, "").replace(/^Round of\s*/i, "R")
                }${fixture.leg && fixture.leg !== "1/1" ? ` · ${fixture.leg}` : ""}` : ""}
                {isFinished && !isCancelled
                  ? ` · ${hasPoints ? `+${fixturePoints}` : "0"} pts`
                  : isLive
                    ? ` · ${fixture.liveMinute != null ? `${fixture.liveMinute}′` : "LIVE"}`
                    : ` · ${formatKickoffTime(fixture.kickoffAt)}`}
              </Text>
            </View>
          )}

          <View
            style={[
              styles.matchContent,
              isCancelled && { opacity: 0.6 },
            ]}
          >
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
                    isUpcoming={!isFinished && !isLive}
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

            {/* Away Row - green debug */}
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
                    isUpcoming={!isFinished && !isLive}
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
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerRow: {},
  outerRowSpacing: {
    marginBottom: 0,
  },
  cardShadowWrapper: {
    flex: 1,
  },
  matchCard: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    borderWidth: 1,
    shadowOpacity: 0,
    elevation: 0,
  },
  cardConnected: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cardWithBottomBorder: {},
  leagueInfoRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 0,
  },
  leagueText: {
    fontSize: 11,
    fontWeight: "500",
  },
  separator: {
    fontSize: 11,
    opacity: 0.4,
    marginHorizontal: -3,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  predictionColumn: {
    width: 36,
    alignItems: "center",
  },
  matchContent: {
    flexDirection: "column",
    gap: 0,
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
  pointsText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
