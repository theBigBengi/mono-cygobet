import React, { useCallback, useMemo, useEffect } from "react";
import { View, StyleSheet, TextInput, Pressable, Text, Platform } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { formatKickoffTime } from "@/utils/fixture";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { useTheme, spacing, radius } from "@/lib/theme";
import { useEntityTranslation } from "@/lib/i18n/i18n.entities";
import { MaterialCommunityIcons, Ionicons, AntDesign, FontAwesome6 } from "@expo/vector-icons";
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
  /** Show "Round X" instead of "RX" */
  fullRoundLabel?: boolean;
  matchNumber?: string;
  timelineFilled?: boolean;
  timelineConnectorFilled?: boolean;
  isFirstInTimeline?: boolean;
  isLastInTimeline?: boolean;
  isNextToPredict?: boolean;
  isMaxPoints?: boolean;
  cardLayout?: "vertical" | "horizontal";
  /** When true, show full team name instead of short code */
  useFullName?: boolean;
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
  fullRoundLabel = false,
  matchNumber,
  isNextToPredict = false,
  isMaxPoints = false,
  cardLayout = "vertical",
  useFullName = true,
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
      router.push({ pathname: '/fixtures/[id]', params: { id: String(fixture.id) } });
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

  const homeTeamName = useFullName
    ? translateTeam(fixture.homeTeam?.name, t("common.home"))
    : (fixture.homeTeam?.shortCode ?? translateTeam(fixture.homeTeam?.name, t("common.home")));
  const awayTeamName = useFullName
    ? translateTeam(fixture.awayTeam?.name, t("common.away"))
    : (fixture.awayTeam?.shortCode ?? translateTeam(fixture.awayTeam?.name, t("common.away")));

  const isCardFocused = isHomeFocused || isAwayFocused;

  const handlePressCenter = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isEditable) {
      homeRef.current?.focus();
    } else {
      onPressCard();
    }
  }, [isEditable, onPressCard]);

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
    if (!hideRound && fixture.round) parts.push(fullRoundLabel ? `Round ${fixture.round}` : `R${fixture.round}`);
    return parts.length > 0 ? parts.join(" · ") : null;
  }, [showLeagueInfo, hideLeagueName, hideRound, fullRoundLabel, fixture.league?.name, fixture.round, fixture.kickoffAt]);

  // --- Status data (shared by box + inline renderers) ---
  const statusData = useMemo(() => {
    // Live → show match minute
    if (isLive) {
      return { top: `${fixture.liveMinute ?? 0}'`, bottom: undefined, bgColor: "transparent", textColor: theme.colors.live, inline: `${fixture.liveMinute ?? 0}'` };
    }

    // Cancelled / Postponed / Abandoned → show date + time like regular games
    if (isCancelled && fixture.state && fixture.kickoffAt) {
      const k = new Date(fixture.kickoffAt);
      const hh = k.getHours().toString().padStart(2, "0");
      const mm = k.getMinutes().toString().padStart(2, "0");
      const dd = k.getDate().toString().padStart(2, "0");
      const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const mo = (k.getMonth() + 1).toString().padStart(2, "0");
      const dateStr = `${dd} ${MONTHS_SHORT[k.getMonth()]}`;
      const numericDate = `${dd}/${mo}`;
      const c = theme.colors.textSecondary;
      const labelMap: Record<string, string> = {
        CANCELLED: "CAN",
        POSTPONED: "PPD",
        SUSPENDED: "SUS",
        ABANDONED: "ABD",
        INTERRUPTED: "INT",
        WO: "W/O",
      };
      const label = labelMap[fixture.state] ?? fixture.state.slice(0, 3).toUpperCase();
      return { top: hh, bottom: mm, date: dateStr, numericDate, bgColor: "transparent", textColor: c, cancelLabel: label, inline: `${dateStr} · ${hh}:${mm}` };
    }
    if (isCancelled && fixture.state) {
      const labelMap: Record<string, string> = {
        CANCELLED: "CAN",
        POSTPONED: "PPD",
        SUSPENDED: "SUS",
        ABANDONED: "ABD",
        INTERRUPTED: "INT",
        WO: "W/O",
      };
      const label = labelMap[fixture.state] ?? fixture.state.slice(0, 3).toUpperCase();
      const c = theme.colors.textSecondary;
      return { top: label, bottom: undefined, bgColor: "transparent", textColor: c, inline: label };
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
      const dateStr = `${dd} ${MONTHS_SHORT[k.getMonth()]}`;
      const numericDate = `${dd}/${mo}`;
      return { top: hh, bottom: mm, date: dateStr, numericDate, bgColor: "transparent", textColor: sc, inline: hideRound ? `${dateStr} ${hh}:${mm}` : `${hh}:${mm}` };
    }

    const sc = theme.colors.textSecondary;
    return { top: "\u2014", bottom: undefined, bgColor: "transparent", textColor: sc, inline: "\u2014" };
  }, [isLive, isCancelled, fixture, theme, hideRound]);

  // --- Right box data (points for finished games, or cancelled indicator) ---
  const rightBoxData = useMemo(() => {
    if (isCancelled) {
      const c = theme.colors.textSecondary;
      return { top: "—", bottom: undefined, bgColor: c + "12", textColor: c, icon: "cancel" as const };
    }
    if (!isFinished) return null;
    const fp = fixture.prediction;
    const hasServerPrediction = fp != null && fp.home != null && fp.away != null;
    if (!hasServerPrediction) {
      return { top: "0", bottom: "PTS", bgColor: theme.colors.danger + "15", textColor: theme.colors.danger };
    }
    const pts = fp.points ?? 0;
    const predResult: "max" | true | false =
      isMaxPoints ? "max" : pts > 0 ? true : false;
    const bgColor = predResult === "max" ? theme.colors.success + "20" : predResult === true ? theme.colors.warning + "20" : theme.colors.danger + "15";
    const textColor = predResult === "max" ? theme.colors.success : predResult === true ? theme.colors.warning : theme.colors.danger;
    return { top: String(pts), bottom: "PTS", bgColor, textColor };
  }, [isFinished, isCancelled, fixture.prediction, isMaxPoints, theme]);

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
      const strikethrough = isCancelled ? { textDecorationLine: "line-through" as const } : undefined;
      return (
        <View style={[styles.statusBox, { height: undefined }]}>
          <Text style={[styles.statusMonthText, { color: statusData.textColor, fontSize: 11, fontWeight: "500" }, strikethrough]}>{statusData.numericDate}</Text>
          <Text style={[styles.statusMonthText, { color: statusData.textColor, fontSize: 11, fontWeight: "500" }, strikethrough]}>{`${statusData.top}:${statusData.bottom}`}</Text>
        </View>
      );
    }
    return (
      <View style={[styles.statusBox, { backgroundColor: statusData.bgColor }]}>
        <Text style={[styles.statusDayText, { color: statusData.textColor, fontSize: 20 }]}>{statusData.top}</Text>
        <Text style={[styles.statusMonthText, { color: statusData.textColor, fontSize: 10 }]}>{statusData.bottom}</Text>
      </View>
    );
  }, [statusData, isCancelled]);

  const highlightOpacity = useSharedValue(0);
  useEffect(() => {
    if (isHighlighted) {
      highlightOpacity.value = withTiming(1, { duration: 300 });
    } else {
      highlightOpacity.value = withTiming(0, { duration: 500 });
    }
  }, [isHighlighted]);
  const highlightAnimStyle = useAnimatedStyle(() => ({
    opacity: highlightOpacity.value,
  }));

  if (cardLayout === "horizontal") {
    return (
      <View ref={cardRef} style={styles.outerRow}>
        <View style={styles.cardRow}>
          {/* Card — center */}
          <View
            style={[
              { flex: 1, backgroundColor: theme.colors.textSecondary + "12", borderRadius: radius.s, paddingHorizontal: spacing.sm, overflow: "hidden" as const },
              isCancelled && { opacity: 0.6 },
            ]}
          >
            <Animated.View style={[styles.highlightOverlay, { backgroundColor: theme.colors.primary + "15" }, highlightAnimStyle]} pointerEvents="none" />
            {/* Match row: [Home] [Center] [Away] */}
            <View style={styles.hRow}>
              {/* Home team */}
              <Pressable style={styles.hTeamHalf} onPress={handlePressCenter}>
                <TeamLogo imagePath={fixture.homeTeam?.imagePath} teamName={homeTeamName} size={22} rounded={false} />
                <AppText
                  variant="body"
                  numberOfLines={1}
                  style={[
                    styles.hTeamName,
                    { color: isHomeFocused ? theme.colors.primary : (!isFinished && !isLive) ? theme.colors.textPrimary : theme.colors.textSecondary },
                  ]}
                >
                  {homeTeamName}
                </AppText>
              </Pressable>

              {/* Center: prediction always aligned with logos, result pinned below */}
              <View style={styles.hCenter}>
                {predictionMode === "MatchWinner" && onSelectOutcome ? null : (
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
                )}
                {(isFinished || isLive) && gameResultOrTime && (
                  <Text style={[styles.hResultText, { color: isLive ? theme.colors.live : theme.colors.textSecondary, position: "absolute", bottom: -14 }]}>
                    {gameResultOrTime.home ?? "-"}:{gameResultOrTime.away ?? "-"}
                  </Text>
                )}
              </View>

              {/* Away team */}
              <Pressable style={[styles.hTeamHalf, { flexDirection: "row-reverse" }]} onPress={handlePressCenter}>
                <TeamLogo imagePath={fixture.awayTeam?.imagePath} teamName={awayTeamName} size={22} rounded={false} />
                <AppText
                  variant="body"
                  numberOfLines={1}
                  style={[
                    styles.hTeamName,
                    { color: isAwayFocused ? theme.colors.primary : (!isFinished && !isLive) ? theme.colors.textPrimary : theme.colors.textSecondary, textAlign: "right" },
                  ]}
                >
                  {awayTeamName}
                </AppText>
              </Pressable>
            </View>
          </View>{/* close card */}



        </View>
      </View>
    );
  }

  // ── Vertical layout (default) ──
  return (
    <View ref={cardRef} style={styles.outerRow}>
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
            {/* Unified card: date/time + match content */}
            <View style={[styles.hRowBorder, { backgroundColor: theme.colors.textSecondary + "12", flexDirection: "row", alignItems: "stretch", flex: 1, overflow: "hidden", paddingLeft: 2 }]}>
              <Animated.View style={[styles.highlightOverlay, { backgroundColor: theme.colors.primary + "15" }, highlightAnimStyle]} pointerEvents="none" />
              {/* Status Box — left column */}
              <View style={{ width: 42, alignItems: "center", justifyContent: "center", marginRight: spacing.sm }}>
                {statusBox}
              </View>

              {/* Match content */}
              <View
                style={[
                  styles.matchContent,
                  { flex: 1 },
                  isCancelled && { opacity: 0.6 },
                ]}
              >
                {/* Home Row */}
                <View style={styles.teamRow}>
                  <Pressable
                    style={styles.matchPressable}
                    onPress={handlePressCenter}
                  >
                    <View style={styles.teamPressable}>
                      <TeamRow
                        team={fixture.homeTeam}
                        teamName={homeTeamName}
                        isWinner={isHomeWinner}
                        isUpcoming={!isFinished && !isLive}
                        isFocused={isHomeFocused}
                      />
                    </View>
                    <View style={styles.resultColumn}>
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
                    <View style={styles.predictionColumn}>
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
                    onPress={handlePressCenter}
                  >
                    <View style={styles.teamPressable}>
                      <TeamRow
                        team={fixture.awayTeam}
                        teamName={awayTeamName}
                        isWinner={isAwayWinner}
                        isUpcoming={!isFinished && !isLive}
                        isFocused={isAwayFocused}
                      />
                    </View>
                    <View style={styles.resultColumn}>
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
                    <View style={styles.predictionColumn}>
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
            <Pressable style={styles.statusCol} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPressCard(); }}>
              {rightBoxData ? (
                rightBoxData.icon === "cancel" ? (
                  <View style={[styles.statusBox, { backgroundColor: rightBoxData.bgColor, alignItems: "center", justifyContent: "center" }]}>
                    <MaterialCommunityIcons name="cancel" size={16} color={rightBoxData.textColor} />
                    <Text style={[styles.statusMonthText, { color: rightBoxData.textColor, marginTop: 1 }]}>{("cancelLabel" in statusData ? statusData.cancelLabel : undefined) ?? statusData.top}</Text>
                  </View>
                ) : (
                  <View style={[styles.statusBox, { backgroundColor: rightBoxData.bgColor }]}>
                    <Text style={[styles.statusDayText, { color: rightBoxData.textColor }]}>{rightBoxData.top}</Text>
                    {rightBoxData.bottom && <Text style={[styles.statusMonthText, { color: rightBoxData.textColor }]}>{rightBoxData.bottom}</Text>}
                  </View>
                )
              ) : isLive ? (
                <View style={[styles.statusBox, { backgroundColor: theme.colors.primary + "20" }]}>
                  <Text style={[styles.statusDayText, { color: theme.colors.primary }]}>?</Text>
                  <Text style={[styles.statusMonthText, { color: theme.colors.primary }]}>PTS</Text>
                </View>
              ) : (
                <View style={[styles.statusBox, { backgroundColor: "transparent", alignItems: "center", justifyContent: "center" }]}>
                  {hasPrediction ? (
                    <View style={{ width: 20, height: 20, borderRadius: radius.sm, backgroundColor: "#34C75920", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="checkmark" size={12} color="#34C759" />
                    </View>
                  ) : (
                    <View style={{ width: 20, height: 20, borderRadius: radius.sm, borderWidth: 1.5, borderColor: theme.colors.textSecondary + "90", alignItems: "center", justifyContent: "center" }}>
                      <FontAwesome6 name="plus" size={11} color={theme.colors.textSecondary + "90"} />
                    </View>
                  )}
                </View>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerRow: {
    marginBottom: spacing.sm,
  },
  outerRowSpacing: {
    marginBottom: radius.sm,
  },
  cardShadowWrapper: {
    flex: 1,
  },
  highlightOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.s,
    zIndex: 1,
  },
  matchCard: {
    borderWidth: 0,
    borderRadius: radius.sm,
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
    gap: radius.sm,
  },
  statusCol: {
    width: 42,
  },
  statusBox: {
    width: 42,
    height: 42,
    borderRadius: radius.xs,
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
    fontWeight: "700",
  },
  cardContent: {
    flex: 1,
    overflow: "hidden",
  },
  leagueInfoRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: spacing.xxs,
  },
  leagueText: {
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 11,
  },
  resultColumn: {
    width: 36,
    alignItems: "center",
    justifyContent: "center",
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
    gap: 0,
  },
  matchPressable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  teamPressable: {
    flex: 1,
  },
  pointsText: {
    fontSize: 11,
    fontWeight: "700",
  },
  // ── Horizontal layout styles ──
  hStatusText: {
    fontSize: 10,
    fontWeight: "700" as const,
    lineHeight: 10,
  },
  hPointsBadge: {
    paddingHorizontal: radius.xs,
    paddingVertical: 3,
    borderRadius: radius.xs,
  },
  hStatusRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingVertical: spacing.xs,
    paddingHorizontal: radius.xs,
  },
  hRowBorder: {
    borderRadius: radius.s,
    paddingVertical: radius.xs,
    paddingHorizontal: spacing.sm,
  },
  hRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    writingDirection: "ltr" as const,
    gap: radius.xs,
    height: 50,
    overflow: "hidden" as const,
  },
  hTeamHalf: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: radius.xs,
    minWidth: 0,
  },
  hTeamName: {
    fontSize: 11,
    fontWeight: "500" as const,
    flex: 1,
  },
  hCenter: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: radius.sm,
  },
  hResultsRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingBottom: spacing.xxs,
  },
  hResultText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
});
