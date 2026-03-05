import React, { useCallback, useMemo } from "react";
import { View, StyleSheet, TextInput, Pressable, Text, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { formatKickoffTime } from "@/utils/fixture";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { useTheme } from "@/lib/theme";
import { useEntityTranslation } from "@/lib/i18n/i18n.entities";
import { AppText, TeamLogo } from "@/components/ui";
import type { GroupPrediction } from "@/features/group-creation/selection/games";
import type { FixtureItem, PositionInGroup } from "@/types/common";
import type { FocusedField, PredictionMode } from "../types";
import { useMatchCardState } from "../hooks/useMatchCardState";
import { getOutcomeFromPrediction } from "../utils/utils";
import { ScoreInput } from "./ScoreInput";
import { ScoreInputPair } from "./ScoreInputPair";
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
  hideRound?: boolean;
  matchNumber?: string;
  timelineFilled?: boolean;
  timelineConnectorFilled?: boolean;
  isFirstInTimeline?: boolean;
  isLastInTimeline?: boolean;
  isNextToPredict?: boolean;
  isMaxPoints?: boolean;
  cardLayout?: "vertical" | "horizontal";
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
  hideRound = false,
  matchNumber,
  isNextToPredict = false,
  isMaxPoints = false,
  cardLayout = "vertical",
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

  // --- League info line ---
  const leagueInfoText = useMemo(() => {
    if (!showLeagueInfo) return null;
    const parts: string[] = [];
    if (!hideLeagueName && fixture.league?.name) parts.push(fixture.league.name);
    if (!hideRound && fixture.round) parts.push(`R${fixture.round}`);
    return parts.length > 0 ? parts.join(" · ") : null;
  }, [showLeagueInfo, hideLeagueName, hideRound, fixture.league?.name, fixture.round, fixture.kickoffAt]);

  // --- Status data (shared by box + inline renderers) ---
  const statusData = useMemo(() => {
    // Live → show match minute
    if (isLive) {
      return { top: String(fixture.liveMinute ?? 0), bottom: "Live", bgColor: "#3B82F6" + "15", textColor: "#3B82F6", inline: `${fixture.liveMinute ?? 0}' Live` };
    }

    // All other states → show kickoff time (HH:MM)
    if (fixture.kickoffAt) {
      const k = new Date(fixture.kickoffAt);
      const hh = k.getHours().toString().padStart(2, "0");
      const mm = k.getMinutes().toString().padStart(2, "0");
      const sc = theme.colors.textSecondary;
      const dd = k.getDate().toString().padStart(2, "0");
      const mo = (k.getMonth() + 1).toString().padStart(2, "0");
      const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const dateStr = `${k.getDate()} ${MONTHS_SHORT[k.getMonth()]}`;
      return { top: hh, bottom: mm, date: dateStr, bgColor: "transparent", textColor: sc, inline: hideRound ? `${dateStr} ${hh}:${mm}` : `${hh}:${mm}` };
    }

    const sc = theme.colors.textSecondary;
    return { top: "\u2014", bottom: undefined, bgColor: "transparent", textColor: sc, inline: "\u2014" };
  }, [isLive, fixture, theme, hideRound]);

  // --- Right box data (points for finished games) ---
  const rightBoxData = useMemo(() => {
    if (!isFinished) return null;
    const fp = fixture.prediction;
    const hasServerPrediction = fp != null && fp.home != null && fp.away != null;
    if (!hasServerPrediction) {
      return { top: "0", bottom: "pts", bgColor: "#EF4444" + "15", textColor: "#EF4444" };
    }
    const pts = fp.points ?? 0;
    const predResult: "max" | true | false =
      isMaxPoints ? "max" : pts > 0 ? true : false;
    const bgColor = predResult === "max" ? "#10B981" + "20" : predResult === true ? "#FFB020" + "20" : "#EF4444" + "15";
    const textColor = predResult === "max" ? "#10B981" : predResult === true ? "#FFB020" : "#EF4444";
    return { top: String(pts), bottom: "pts", bgColor, textColor };
  }, [isFinished, fixture.prediction, isMaxPoints]);

  // --- Status box (for vertical layout) ---
  const statusBox = useMemo(() => {
    if (statusData.bottom === undefined) {
      return (
        <View style={[styles.statusBox, { backgroundColor: statusData.bgColor }]}>
          <Text style={[styles.statusText, { color: statusData.textColor }]}>{statusData.top}</Text>
        </View>
      );
    }
    if (statusData.date) {
      return (
        <View style={[styles.statusBox, { backgroundColor: statusData.bgColor }]}>
          <Text style={[styles.statusMonthText, { color: statusData.textColor, fontSize: 10 }]}>{statusData.date}</Text>
          <Text style={[styles.statusMonthText, { color: statusData.textColor, fontSize: 12, fontWeight: "800" }]}>{`${statusData.top}:${statusData.bottom}`}</Text>
        </View>
      );
    }
    return (
      <View style={[styles.statusBox, { backgroundColor: statusData.bgColor }]}>
        <Text style={[styles.statusDayText, { color: statusData.textColor, fontSize: 20 }]}>{statusData.top}</Text>
        <Text style={[styles.statusMonthText, { color: statusData.textColor, fontSize: 10 }]}>{statusData.bottom}</Text>
      </View>
    );
  }, [statusData]);

  if (cardLayout === "horizontal") {
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
            {/* Info row: time · league | points */}
            <View style={[styles.hStatusRow, { backgroundColor: "rgba(255,255,0,0.2)" }]}>
              <Text style={[styles.hStatusText, { color: statusData.textColor, backgroundColor: "rgba(255,255,0,0.3)" }]}>
                {statusData.inline}
              </Text>
              {leagueInfoText && (
                <AppText style={[styles.leagueText, { color: theme.colors.textSecondary, marginLeft: 6, backgroundColor: "rgba(0,255,255,0.2)" }]}>
                  {leagueInfoText}
                </AppText>
              )}
              {rightBoxData && (
                <Text style={[styles.hStatusText, { color: rightBoxData.textColor, marginLeft: "auto", backgroundColor: "rgba(255,0,255,0.2)" }]}>
                  {rightBoxData.top} {rightBoxData.bottom}
                </Text>
              )}
            </View>

            {/* Horizontal match row */}
            <View
              style={[
                styles.hRow,
                isCancelled && { opacity: 0.6 },
              ]}
            >
              {/* Home half */}
              <Pressable
                style={[styles.hTeamHalf, { backgroundColor: "rgba(255,0,0,0.1)" }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onPressCard();
                }}
              >
                <TeamLogo imagePath={fixture.homeTeam?.imagePath} teamName={homeTeamName} size={18} rounded={false} />
                <AppText
                  variant="body"
                  numberOfLines={1}
                  style={[
                    styles.hTeamName,
                    { color: (!isFinished && !isLive) ? theme.colors.textPrimary : theme.colors.textSecondary, backgroundColor: "rgba(255,0,0,0.2)" },
                  ]}
                >
                  {homeTeamName}
                </AppText>
                <View style={{ backgroundColor: "rgba(255,165,0,0.2)" }}>
                  <ResultDisplay
                    result={gameResultOrTime}
                    isLive={isLive}
                    isFinished={isFinished}
                    isCancelled={isCancelled}
                    isHomeWinner={isHomeWinner}
                    isAwayWinner={isAwayWinner}
                    type="home"
                  />
                </View>
              </Pressable>

              {/* Score inputs center */}
              {predictionMode === "MatchWinner" && onSelectOutcome ? null : (
                <View style={[styles.hScoresCenter, { backgroundColor: "rgba(0,255,0,0.15)" }]}>
                  <ScoreInputPair
                    homeValue={prediction.home}
                    awayValue={prediction.away}
                    isHomeFocused={isHomeFocused}
                    isAwayFocused={isAwayFocused}
                    isEditable={isEditable}
                    isFinished={isFinished}
                    isLive={isLive}
                    homeRef={homeRef}
                    awayRef={awayRef}
                    onHomeChange={handleHomeChange}
                    onAwayChange={handleAwayChange}
                    onHomeFocus={handleHomeFocus}
                    onAwayFocus={handleAwayFocus}
                    onBlur={onBlur}
                    onHomeAutoNext={onAutoNext ? handleHomeAutoNext : undefined}
                    onAwayAutoNext={onAutoNext ? handleAwayAutoNext : undefined}
                    isCorrect={predictionSuccess}
                  />
                </View>
              )}

              {/* Away half */}
              <Pressable
                style={[styles.hTeamHalf, { backgroundColor: "rgba(0,0,255,0.1)" }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onPressCard();
                }}
              >
                <View style={{ backgroundColor: "rgba(255,165,0,0.2)" }}>
                  <ResultDisplay
                    result={gameResultOrTime}
                    isLive={isLive}
                    isFinished={isFinished}
                    isCancelled={isCancelled}
                    isHomeWinner={isHomeWinner}
                    isAwayWinner={isAwayWinner}
                    type="away"
                  />
                </View>
                <AppText
                  variant="body"
                  numberOfLines={1}
                  style={[
                    styles.hTeamName,
                    { color: (!isFinished && !isLive) ? theme.colors.textPrimary : theme.colors.textSecondary, textAlign: "right", backgroundColor: "rgba(0,0,255,0.2)" },
                  ]}
                >
                  {awayTeamName}
                </AppText>
                <TeamLogo imagePath={fixture.awayTeam?.imagePath} teamName={awayTeamName} size={18} rounded={false} />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // ── Vertical layout (default) ──
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
          {leagueInfoText && !hideRound && (
            <AppText style={[styles.leagueText, { color: theme.colors.textSecondary, marginLeft: 52, marginBottom: 2, backgroundColor: "rgba(0,255,255,0.2)" }]}>
              {leagueInfoText}
            </AppText>
          )}
          <View style={styles.cardRow}>
            {/* Status Box — left column */}
            <View style={[styles.statusCol, { backgroundColor: "rgba(255,255,0,0.2)" }]}>
              {statusBox}
            </View>

            {/* Card content — center */}
            <View style={styles.cardContent}>
              <View
                style={[
                  styles.matchContent,
                  isCancelled && { opacity: 0.6 },
                ]}
              >
                {/* Home Row */}
                <View style={[styles.teamRow, { backgroundColor: "rgba(255,0,0,0.1)" }]}>
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
                    <View style={{ backgroundColor: "rgba(255,165,0,0.2)" }}>
                      <ResultDisplay
                        result={gameResultOrTime}
                        isLive={isLive}
                        isFinished={isFinished}
                        isCancelled={isCancelled}
                        isHomeWinner={isHomeWinner}
                        isAwayWinner={isAwayWinner}
                        type="home"
                      />
                    </View>
                  </Pressable>
                  {predictionMode === "MatchWinner" && onSelectOutcome ? null : (
                    <View style={[styles.predictionColumn, { backgroundColor: "rgba(0,255,0,0.15)" }]} >
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
                <View style={[styles.teamRow, { backgroundColor: "rgba(0,0,255,0.1)" }]}>
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
                    <View style={{ backgroundColor: "rgba(255,165,0,0.2)" }}>
                      <ResultDisplay
                        result={gameResultOrTime}
                        isLive={isLive}
                        isFinished={isFinished}
                        isCancelled={isCancelled}
                        isHomeWinner={isHomeWinner}
                        isAwayWinner={isAwayWinner}
                        type="away"
                      />
                    </View>
                  </Pressable>
                  {predictionMode === "MatchWinner" && onSelectOutcome ? null : (
                    <View style={[styles.predictionColumn, { backgroundColor: "rgba(0,255,0,0.15)" }]} >
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

            {/* Right spacer — mirrors statusCol for symmetry */}
            <View style={[styles.statusCol, { backgroundColor: "rgba(255,0,255,0.2)" }]}>
              {rightBoxData ? (
                <View style={[styles.statusBox, { backgroundColor: rightBoxData.bgColor }]}>
                  <Text style={[styles.statusDayText, { color: rightBoxData.textColor }]}>{rightBoxData.top}</Text>
                  <Text style={[styles.statusMonthText, { color: rightBoxData.textColor }]}>{rightBoxData.bottom}</Text>
                </View>
              ) : (
                <View style={[styles.statusBox, { backgroundColor: theme.colors.textSecondary + "12" }]} />
              )}
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
    marginBottom: 2,
  },
  leagueText: {
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 11,
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
  // ── Horizontal layout styles ──
  hStatusRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  hStatusText: {
    fontSize: 10,
    fontWeight: "700" as const,
    lineHeight: 10,
  },
  hRow: {
    flexDirection: "row" as const,
    alignItems: "stretch" as const,
    writingDirection: "ltr" as const,
    gap: 6,
  },
  hTeamHalf: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    minWidth: 0,
  },
  hTeamName: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500" as const,
    minWidth: 0,
  },
  hScoresCenter: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
});
