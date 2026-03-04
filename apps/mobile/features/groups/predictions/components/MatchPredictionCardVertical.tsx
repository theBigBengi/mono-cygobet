import React, { useCallback, useMemo } from "react";
import { View, StyleSheet, TextInput, Pressable, Text, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { formatKickoffTime } from "@/utils/fixture";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
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

const CRITICAL_COLOR = "#EF4444";
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

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

  // --- Status box logic (same as LobbyPredictionsCTA) ---
  const statusBox = useMemo(() => {
    const now = new Date();
    const tmr = new Date(now);
    tmr.setDate(tmr.getDate() + 1);
    const isSameDay = (d: Date, ref: Date) =>
      d.getDate() === ref.getDate() && d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();

    const predResult: "max" | true | false | undefined =
      isFinished && hasPrediction
        ? isMaxPoints ? "max" : hasPoints ? true : false
        : undefined;

    // Live
    if (isLive) {
      return (
        <View style={[styles.statusBox, { backgroundColor: "#3B82F6" + "15" }]}>
          <Text style={[styles.statusDayText, { color: "#3B82F6" }]}>{fixture.liveMinute ?? 0}</Text>
          <Text style={[styles.statusMonthText, { color: "#3B82F6" }]}>Live</Text>
        </View>
      );
    }

    // Finished with prediction points
    if (isFinished && fixture.prediction?.points != null) {
      const bgColor = predResult === "max" ? "#10B981" + "20"
        : predResult === true ? "#FFB020" + "20"
        : "#EF4444" + "15";
      const textColor = predResult === "max" ? "#10B981"
        : predResult === true ? "#FFB020"
        : "#EF4444";
      return (
        <View style={[styles.statusBox, { backgroundColor: bgColor }]}>
          <Text style={[styles.statusDayText, { color: textColor }]}>{fixture.prediction.points}</Text>
          <Text style={[styles.statusMonthText, { color: textColor }]}>pts</Text>
        </View>
      );
    }

    // Finished without prediction
    if (isFinished) {
      return (
        <View style={[styles.statusBox, { backgroundColor: theme.colors.textSecondary + "12" }]}>
          <Text style={[styles.statusText, { color: theme.colors.textSecondary }]}>FT</Text>
        </View>
      );
    }

    // Upcoming — date/countdown
    if (fixture.kickoffAt) {
      const k = new Date(fixture.kickoffAt);
      const isToday = isSameDay(k, now);
      const urgentColor = !hasPrediction ? CRITICAL_COLOR : theme.colors.textSecondary;

      if (isToday) {
        const diff = k.getTime() - now.getTime();
        if (diff <= 0) {
          const hh = k.getHours().toString().padStart(2, "0");
          const mm = k.getMinutes().toString().padStart(2, "0");
          return (
            <View style={[styles.statusBox, { backgroundColor: urgentColor + "12" }]}>
              <Text style={[styles.statusDayText, { color: urgentColor }]}>{hh}</Text>
              <Text style={[styles.statusMonthText, { color: urgentColor }]}>{mm}</Text>
            </View>
          );
        }
        const totalMin = Math.floor(diff / 60000);
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        if (h === 0) {
          return (
            <View style={[styles.statusBox, { backgroundColor: urgentColor + "12" }]}>
              <Text style={[styles.statusDayText, { color: urgentColor }]}>{m}</Text>
              <Text style={[styles.statusMonthText, { color: urgentColor }]}>min</Text>
            </View>
          );
        }
        return (
          <View style={[styles.statusBox, { backgroundColor: urgentColor + "12" }]}>
            <Text style={[styles.statusDayText, { color: urgentColor }]}>{h}h</Text>
            <Text style={[styles.statusMonthText, { color: urgentColor }]}>{m}m</Text>
          </View>
        );
      }

      // Tomorrow or later
      const sc = theme.colors.textSecondary;
      return (
        <View style={[styles.statusBox, { backgroundColor: sc + "12" }]}>
          <Text style={[styles.statusMonthText, { color: sc }]}>{MONTHS[k.getMonth()]}</Text>
          <Text style={[styles.statusDayText, { color: sc }]}>{k.getDate()}</Text>
        </View>
      );
    }

    // Fallback
    return (
      <View style={[styles.statusBox, { backgroundColor: theme.colors.textSecondary + "12" }]}>
        <Text style={[styles.statusText, { color: theme.colors.textSecondary }]}>{"\u2014"}</Text>
      </View>
    );
  }, [isLive, isFinished, fixture, hasPrediction, hasPoints, isMaxPoints, theme]);

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
              backgroundColor: "transparent",
              borderColor: "transparent",
              borderBottomColor: "transparent",
              ...(Platform.OS === "android" && positionInGroup !== "single"
                ? { elevation: 0 }
                : {}),
            },
          ]}
        >
          <View style={styles.cardRow}>
            {/* Status Box — left column */}
            <View style={styles.statusCol}>
              {statusBox}
            </View>

            {/* Card content — right side */}
            <View style={styles.cardContent}>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerRow: {
    marginBottom: 10,
  },
  outerRowSpacing: {
    marginBottom: 10,
  },
  cardShadowWrapper: {
    flex: 1,
  },
  matchCard: {
    borderWidth: 0,
    borderRadius: 10,
    shadowOpacity: 0,
    elevation: 0,
  },
  cardConnected: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cardWithBottomBorder: {},
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusCol: {
    width: 42,
  },
  statusBox: {
    width: 42,
    height: 42,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  statusDayText: {
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 19,
  },
  statusMonthText: {
    fontSize: 9,
    fontWeight: "700",
    textAlign: "center",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  cardContent: {
    flex: 1,
  },
  leagueInfoRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 0,
  },
  leagueText: {
    fontSize: 11,
    fontWeight: "500",
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
