// DEBUG SCREEN — Remove after done tweaking SingleGameContent
// Shows all game states with mock data so you can visually debug each state.

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Dimensions, ScrollView } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { isFinished as isFinishedState } from "@repo/utils";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
  interpolate,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/lib/theme";
import { groupsKeys } from "@/domains/groups";
import { SingleGameContent } from "../../predictions/components/SingleGameContent";
import { SingleGameMatchCard } from "../../predictions/components/SingleGameMatchCard";
import { ScoresInput } from "../../predictions/components/ScoresInput";
import { VerticalScoreSliderMock } from "../../predictions/components/VerticalScoreSliderMock";
import { AppText, TeamLogo } from "@/components/ui";
import { formatKickoffDateTime } from "@/utils/fixture";
import type { FixtureItem } from "@/types/common";
import type { GroupPrediction } from "@/features/group-creation/selection/games";
import type { PredictionMode } from "../../predictions/types";
import type { ApiPredictionsOverviewResponse } from "@repo/types";
import Svg, { Line } from "react-native-svg";

const now = new Date();
const hours = (h: number) => new Date(now.getTime() + h * 60 * 60 * 1000).toISOString();
const yesterday = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();

const team = (id: number, name: string, shortCode: string) => ({
  id,
  name,
  shortCode,
  imagePath: null,
  firstKitColor: null,
  secondKitColor: null,
  thirdKitColor: null,
});

const HOME_TEAMS = [
  team(1, "Liverpool", "LIV"),
  team(3, "Chelsea", "CHE"),
  team(5, "Tottenham Hotspur", "TOT"),
  team(7, "Manchester City", "MCI"),
  team(9, "Aston Villa", "AVL"),
  team(11, "West Ham United", "WHU"),
  team(13, "Wolverhampton", "WOL"),
  team(15, "Brighton", "BHA"),
];

const AWAY_TEAMS = [
  team(2, "Arsenal", "ARS"),
  team(4, "Manchester United", "MUN"),
  team(6, "Newcastle United", "NEW"),
  team(8, "Everton", "EVE"),
  team(10, "Fulham", "FUL"),
  team(12, "Crystal Palace", "CRY"),
  team(14, "Bournemouth", "BOU"),
  team(16, "Nottm Forest", "NFO"),
];

function mockFixture(
  id: number,
  opts: {
    state?: string;
    kickoffAt?: string;
    homeScore90?: number | null;
    awayScore90?: number | null;
    liveMinute?: number | null;
    prediction?: { home: number; away: number } | null;
    points?: number | null;
  } = {},
): FixtureItem {
  const homeIdx = (id - 1) % HOME_TEAMS.length;
  const awayIdx = (id - 1) % AWAY_TEAMS.length;
  const isFinished = isFinishedState(opts.state ?? "NS");
  return {
    id,
    name: `${HOME_TEAMS[homeIdx].name} vs ${AWAY_TEAMS[awayIdx].name}`,
    kickoffAt: opts.kickoffAt ?? hours(2),
    startTs: Math.floor(new Date(opts.kickoffAt ?? hours(2)).getTime() / 1000),
    state: opts.state ?? "NS",
    stage: null,
    round: null,
    leg: null,
    liveMinute: opts.liveMinute ?? null,
    homeTeam: HOME_TEAMS[homeIdx],
    awayTeam: AWAY_TEAMS[awayIdx],
    homeScore90: opts.homeScore90 ?? null,
    awayScore90: opts.awayScore90 ?? null,
    result: null,
    prediction: opts.prediction
      ? { home: opts.prediction.home, away: opts.prediction.away, updatedAt: now.toISOString(), placedAt: now.toISOString(), settled: isFinished, points: opts.points ?? null }
      : undefined,
  } as FixtureItem;
}

// ── Fake group ID for seeding query cache ──
const FAKE_GROUP_ID = 999999;

const MOCK_PARTICIPANTS = [
  { id: 101, username: "You", number: 1, totalPoints: 24 },
  { id: 102, username: "Messi_Fan_10", number: 2, totalPoints: 21 },
  { id: 103, username: "TheRealCR7", number: 3, totalPoints: 18 },
  { id: 104, username: "GKLegend99", number: 4, totalPoints: 15 },
  { id: 105, username: "TikiTaka_FC", number: 5, totalPoints: 12 },
];

/** Build mock predictions overview for a single fixture so FixturePredictionsList renders rows. */
function buildMockOverview(fixture: FixtureItem): ApiPredictionsOverviewResponse {
  const fId = fixture.id;
  const predictions: Record<string, string | null> = {
    [`101_${fId}`]: "2:1",
    [`102_${fId}`]: "1:0",
    [`103_${fId}`]: "0:2",
    [`104_${fId}`]: "1:1",
    [`105_${fId}`]: "3:1",
  };
  const predictionPoints: Record<string, string | null> = {
    [`101_${fId}`]: "3",
    [`102_${fId}`]: "1",
    [`103_${fId}`]: "0",
    [`104_${fId}`]: "2",
    [`105_${fId}`]: "0",
  };
  const overviewFixture = {
    id: fixture.id,
    name: fixture.name,
    homeTeam: fixture.homeTeam!,
    awayTeam: fixture.awayTeam!,
    result: fixture.homeScore90 != null && fixture.awayScore90 != null ? `${fixture.homeScore90}:${fixture.awayScore90}` : null,
    startTs: fixture.startTs,
    state: fixture.state,
    liveMinute: fixture.liveMinute,
    homeScore90: fixture.homeScore90,
    awayScore90: fixture.awayScore90,
  };
  return {
    status: "success",
    message: "Mock data",
    data: {
      participants: MOCK_PARTICIPANTS,
      fixtures: [overviewFixture],
      predictions,
      predictionPoints,
    },
  };
}

// ── Mode definitions ──

type ModeName =
  | "notStarted"
  | "notStartedPredicted"
  | "live1stHalf"
  | "liveHalftime"
  | "live2ndHalf"
  | "finishedFT"
  | "finishedFTPEN"
  | "cancelled"
  | "postponed"
  | "matchWinner"
  | "slidersV2";

interface ModeConfig {
  key: ModeName;
  label: string;
  fixture: FixtureItem;
  prediction: GroupPrediction;
  isSaved: boolean;
  predictionMode: PredictionMode;
  /** When true, render the V2 layout (vertical sliders on sides + card in center) instead of SingleGameContent. */
  v2Layout?: boolean;
}

const MODES: ModeConfig[] = [
  {
    key: "notStarted",
    label: "NS \u2014 No Pred",
    fixture: mockFixture(1, { kickoffAt: hours(2) }),
    prediction: { home: null, away: null },
    isSaved: false,
    predictionMode: "CorrectScore",
  },
  {
    key: "notStartedPredicted",
    label: "NS \u2014 Predicted",
    fixture: mockFixture(2, { kickoffAt: hours(2), prediction: { home: 2, away: 1 } }),
    prediction: { home: 2, away: 1 },
    isSaved: true,
    predictionMode: "CorrectScore",
  },
  {
    key: "live1stHalf",
    label: "LIVE 1H",
    fixture: mockFixture(3, { state: "INPLAY_1ST_HALF", kickoffAt: yesterday(1), prediction: { home: 2, away: 1 }, homeScore90: 1, awayScore90: 0, liveMinute: 34 }),
    prediction: { home: 2, away: 1 },
    isSaved: true,
    predictionMode: "CorrectScore",
  },
  {
    key: "liveHalftime",
    label: "LIVE HT",
    fixture: mockFixture(4, { state: "HT", kickoffAt: yesterday(1), prediction: { home: 1, away: 1 }, homeScore90: 0, awayScore90: 0, liveMinute: 45 }),
    prediction: { home: 1, away: 1 },
    isSaved: true,
    predictionMode: "CorrectScore",
  },
  {
    key: "live2ndHalf",
    label: "LIVE 2H",
    fixture: mockFixture(5, { state: "INPLAY_2ND_HALF", kickoffAt: yesterday(1), prediction: { home: 0, away: 0 }, homeScore90: 1, awayScore90: 2, liveMinute: 67 }),
    prediction: { home: 0, away: 0 },
    isSaved: true,
    predictionMode: "CorrectScore",
  },
  {
    key: "finishedFT",
    label: "FT",
    fixture: mockFixture(6, { state: "FT", kickoffAt: yesterday(6), prediction: { home: 2, away: 1 }, homeScore90: 2, awayScore90: 1, points: 3 }),
    prediction: { home: 2, away: 1 },
    isSaved: true,
    predictionMode: "CorrectScore",
  },
  {
    key: "finishedFTPEN",
    label: "FT PEN",
    fixture: mockFixture(7, { state: "FT_PEN", kickoffAt: yesterday(6), prediction: { home: 1, away: 1 }, homeScore90: 1, awayScore90: 1, points: 2 }),
    prediction: { home: 1, away: 1 },
    isSaved: true,
    predictionMode: "CorrectScore",
  },
  {
    key: "cancelled",
    label: "CANCELLED",
    fixture: mockFixture(8, { state: "CANCELLED", prediction: { home: 1, away: 0 } }),
    prediction: { home: 1, away: 0 },
    isSaved: true,
    predictionMode: "CorrectScore",
  },
  {
    key: "postponed",
    label: "POSTPONED",
    fixture: mockFixture(1, { state: "POSTPONED" }),
    prediction: { home: null, away: null },
    isSaved: false,
    predictionMode: "CorrectScore",
  },
  {
    key: "matchWinner",
    label: "WINNER MODE",
    fixture: mockFixture(2, { kickoffAt: hours(2) }),
    prediction: { home: null, away: null },
    isSaved: false,
    predictionMode: "MatchWinner",
  },
  {
    key: "slidersV2",
    label: "V2 SLIDERS",
    fixture: mockFixture(2, { kickoffAt: hours(2), prediction: { home: 2, away: 1 } }),
    prediction: { home: 2, away: 1 },
    isSaved: true,
    predictionMode: "CorrectScore",
    v2Layout: true,
  },
];

export function DebugSingleGameScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [activeMode, setActiveMode] = useState<ModeName>("notStarted");
  const [isExpanded, setIsExpanded] = useState(false);
  const [centerSize, setCenterSize] = useState({ w: 0, h: 0 });
  const expandAnim = useSharedValue(0);
  const collapsedHeight = useSharedValue(0);
  const containerHeight = useSharedValue(0);
  const current = MODES.find((m) => m.key === activeMode)!;

  const handleExpandCard = useCallback(() => {
    expandAnim.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
    setIsExpanded(true);
  }, [expandAnim]);

  const handleCollapseCard = useCallback(() => {
    expandAnim.value = withTiming(0, { duration: 250, easing: Easing.in(Easing.ease) });
    setIsExpanded(false);
  }, [expandAnim]);

  const DRAG_DISMISS_DISTANCE = 250;

  const swipeDownGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([0, 15])
        .onUpdate((e) => {
          if (e.translationY > 0) {
            expandAnim.value = 1 - Math.min(e.translationY / DRAG_DISMISS_DISTANCE, 1);
          }
        })
        .onEnd(() => {
          if (expandAnim.value < 0.5) {
            expandAnim.value = withTiming(0, { duration: 150, easing: Easing.in(Easing.ease) });
            runOnJS(setIsExpanded)(false);
          } else {
            expandAnim.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.ease) });
          }
        }),
    [expandAnim]
  );

  const cardAnimStyle = useAnimatedStyle(() => {
    const cH = collapsedHeight.value;
    const fH = containerHeight.value;
    return {
      marginHorizontal: interpolate(expandAnim.value, [0, 1], [12, 0]),
      borderRadius: interpolate(expandAnim.value, [0, 1], [16, 0]),
      borderWidth: interpolate(expandAnim.value, [0, 1], [1, 0]),
      ...(cH > 0 && fH > 0
        ? { height: interpolate(expandAnim.value, [0, 1], [cH, fH]) }
        : {}),
    };
  });

  const containerAnimStyle = useAnimatedStyle(() => ({
    paddingHorizontal: interpolate(expandAnim.value, [0, 1], [12, 0]),
  }));

  const screenAnimStyle = useAnimatedStyle(() => ({
    paddingTop: interpolate(expandAnim.value, [0, 1], [60, 0]),
  }));

  const sliderAnimStyle = useAnimatedStyle(() => ({
    width: interpolate(expandAnim.value, [0, 1], [44, 0]),
    opacity: interpolate(expandAnim.value, [0, 0.3], [1, 0]),
    overflow: "hidden" as const,
  }));

  // Crossfade: collapsed content fades out, expanded content fades in
  const collapsedFadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expandAnim.value, [0, 0.4], [1, 0]),
  }));

  const expandedFadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expandAnim.value, [0.3, 0.7], [0, 1]),
  }));

  // Seed the React Query cache with mock predictions overview data whenever the mode changes
  useEffect(() => {
    const mockData = buildMockOverview(current.fixture);
    queryClient.setQueryData(
      groupsKeys.predictionsOverview(FAKE_GROUP_ID),
      mockData
    );
  }, [activeMode, current.fixture, queryClient]);

  const homeRef = useRef(null);
  const awayRef = useRef(null);
  const noopField = useCallback((_fixtureId: number, _type?: "home" | "away") => {}, []);
  const noopUpdate = useCallback(
    (_fixtureId: number, _type: "home" | "away", _text: string) => {},
    []
  );
  const noopSlider = useCallback(
    (_fixtureId: number, _side: "home" | "away", _val: number | null) => {},
    []
  );
  const noopOutcome = useCallback(
    (_fixtureId: number, _outcome: "home" | "draw" | "away") => {},
    []
  );
  const getNextFieldIndex = useCallback(
    (_fixtureId: number, _type: "home" | "away") => -1,
    []
  );
  const navigateToField = useCallback((_index: number) => {}, []);

  return (
    <Animated.View style={[styles.screen, { backgroundColor: theme.colors.background }, screenAnimStyle]}>
      {!current.v2Layout && (
        <>
          {/* Mode tabs */}
          <View style={styles.tabs}>
            {MODES.map((m) => (
              <Pressable
                key={m.key}
                onPress={() => setActiveMode(m.key)}
                style={[
                  styles.tab,
                  {
                    backgroundColor: activeMode === m.key ? theme.colors.primary : theme.colors.cardBackground,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: activeMode === m.key ? theme.colors.textInverse : theme.colors.textPrimary },
                  ]}
                >
                  {m.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Mode title */}
          <Text style={[styles.modeTitle, { color: theme.colors.textSecondary }]}>
            Mode: {current.label}
          </Text>
        </>
      )}

      {/* Content */}
      <View style={styles.content}>
        {current.v2Layout ? (
          <Animated.View
            style={[styles.v2Container, containerAnimStyle]}
            onLayout={(e) => { containerHeight.value = e.nativeEvent.layout.height; }}
          >
            <GestureDetector gesture={swipeDownGesture}>
            <Animated.View
              style={[styles.v2Card, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.border }, cardAnimStyle]}
              onLayout={(e) => {
                if (!isExpanded && collapsedHeight.value === 0) {
                  collapsedHeight.value = e.nativeEvent.layout.height;
                }
              }}
            >
              {/* Home slider (left edge) */}
              <Animated.View style={[styles.v2SliderStrip, styles.v2SliderLeft, { borderRightColor: theme.colors.border }, sliderAnimStyle]}>
                {[9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((digit) => {
                  const isActive = digit === current.prediction.home;
                  const thumbColor = current.fixture.homeTeam?.firstKitColor ?? "#22C55E";
                  return (
                    <View key={digit} style={styles.v2Digit}>
                      {isActive ? (
                        <View style={[styles.v2Thumb, { backgroundColor: thumbColor }]}>
                          <Text style={[styles.v2ThumbText, { color: theme.colors.textInverse }]}>{digit}</Text>
                        </View>
                      ) : (
                        <Text style={[styles.v2DigitText, { color: theme.colors.textSecondary }]}>{digit}</Text>
                      )}
                    </View>
                  );
                })}
              </Animated.View>

              {/* Center content */}
              <Pressable
                style={styles.v2Content}
                onPress={isExpanded ? undefined : handleExpandCard}
                disabled={isExpanded}
                onLayout={(e) => {
                  const { width, height } = e.nativeEvent.layout;
                  setCenterSize({ w: width, h: height });
                }}
              >
                {/* ── COLLAPSED LAYER: diagonal + logos + score ── */}
                <Animated.View style={[StyleSheet.absoluteFill, collapsedFadeStyle]} pointerEvents={isExpanded ? "none" : "auto"}>
                  {/* Diagonal line */}
                  {centerSize.w > 0 && (
                    <Svg
                      width={centerSize.w}
                      height={centerSize.h}
                      style={StyleSheet.absoluteFill}
                      pointerEvents="none"
                    >
                      <Line
                        x1={centerSize.w}
                        y1={0}
                        x2={0}
                        y2={centerSize.h}
                        stroke={theme.colors.border}
                        strokeWidth={1.5}
                      />
                    </Svg>
                  )}
                  <View style={styles.v2LogoTopLeft}>
                    <TeamLogo
                      imagePath={current.fixture.homeTeam?.imagePath}
                      teamName={current.fixture.homeTeam?.name ?? ""}
                      size={56}
                      rounded={false}
                    />
                  </View>
                  <View style={styles.v2LogoBottomRight}>
                    <TeamLogo
                      imagePath={current.fixture.awayTeam?.imagePath}
                      teamName={current.fixture.awayTeam?.name ?? ""}
                      size={56}
                      rounded={false}
                    />
                  </View>
                  <View style={styles.v2ScoreCenter}>
                    <ScoresInput
                      prediction={current.prediction}
                      homeRef={homeRef}
                      awayRef={awayRef}
                      homeFocused={false}
                      awayFocused={false}
                      isSaved={current.isSaved}
                      isEditable={true}
                      isLive={false}
                      onFocus={() => {}}
                      onChange={() => {}}
                      variant="large"
                    />
                  </View>
                </Animated.View>

                {/* ── EXPANDED LAYER: full match screen ── */}
                <Animated.View style={[StyleSheet.absoluteFill, styles.v2ExpandedLayer, expandedFadeStyle]} pointerEvents={isExpanded ? "auto" : "none"}>
                  <View style={{ height: insets.top }} />
                  {/* League bar */}
                  <View style={[styles.exLeagueBar, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
                    <Pressable onPress={handleCollapseCard} hitSlop={12} style={styles.exBackArrow}>
                      <Text style={[styles.exBackArrowText, { color: theme.colors.textPrimary }]}>‹</Text>
                    </Pressable>
                    <AppText variant="caption" style={[styles.exLeagueText, { flex: 1 }]} numberOfLines={1}>
                      {current.fixture.league?.name ?? "Premier League"} {current.fixture.round ? `- Round ${current.fixture.round}` : ""}
                    </AppText>
                  </View>
                  {/* Date */}
                  <View style={[styles.v2InfoPill, { backgroundColor: theme.colors.surface, alignSelf: "center", marginTop: 8 }]}>
                    <AppText variant="caption" color="secondary" numberOfLines={1}>
                      {current.fixture.kickoffAt ? formatKickoffDateTime(current.fixture.kickoffAt) : ""}
                    </AppText>
                  </View>
                  {/* Teams + Score */}
                  <View style={styles.v2ExpandedMatchRow}>
                    <View style={styles.v2ExpandedTeam}>
                      <TeamLogo
                        imagePath={current.fixture.homeTeam?.imagePath}
                        teamName={current.fixture.homeTeam?.name ?? ""}
                        size={72}
                        rounded={false}
                      />
                      <AppText variant="label" style={styles.v2ExpandedTeamName} numberOfLines={2}>
                        {current.fixture.homeTeam?.name ?? "Home"}
                      </AppText>
                    </View>
                    <View style={styles.v2ExpandedScore}>
                      <ScoresInput
                        prediction={current.prediction}
                        homeRef={homeRef}
                        awayRef={awayRef}
                        homeFocused={false}
                        awayFocused={false}
                        isSaved={current.isSaved}
                        isEditable={true}
                        isLive={false}
                        onFocus={() => {}}
                        onChange={() => {}}
                        variant="large"
                      />
                    </View>
                    <View style={styles.v2ExpandedTeam}>
                      <TeamLogo
                        imagePath={current.fixture.awayTeam?.imagePath}
                        teamName={current.fixture.awayTeam?.name ?? ""}
                        size={72}
                        rounded={false}
                      />
                      <AppText variant="label" style={styles.v2ExpandedTeamName} numberOfLines={2}>
                        {current.fixture.awayTeam?.name ?? "Away"}
                      </AppText>
                    </View>
                  </View>
                  {/* Tabs — horizontally scrollable */}
                  <View style={[styles.exTabsRow, { borderBottomColor: theme.colors.border }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.exTabsScroll}>
                      {["Summary", "Predict", "Predictions", "Lineups", "H2H", "Standings", "Odds"].map((tab, i) => (
                        <View key={tab} style={[styles.exTab, i === 0 && styles.exTabActive]}>
                          <AppText
                            variant="caption"
                            style={[
                              styles.exTabText,
                              { color: i === 0 ? theme.colors.primary : theme.colors.textSecondary },
                            ]}
                          >
                            {tab}
                          </AppText>
                          {i === 0 && <View style={[styles.exTabIndicator, { backgroundColor: theme.colors.primary }]} />}
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                  {/* Tab content */}
                  <View style={styles.exTabContent}>
                    <AppText variant="body" color="secondary">
                      Tab content here...
                    </AppText>
                  </View>
                </Animated.View>
              </Pressable>

              {/* Away slider (right edge) */}
              <Animated.View style={[styles.v2SliderStrip, styles.v2SliderRight, { borderLeftColor: theme.colors.border }, sliderAnimStyle]}>
                {[9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((digit) => {
                  const isActive = digit === current.prediction.away;
                  return (
                    <View key={digit} style={styles.v2Digit}>
                      {isActive ? (
                        <View style={[styles.v2Thumb, { backgroundColor: theme.colors.live }]}>
                          <Text style={[styles.v2ThumbText, { color: theme.colors.textInverse }]}>{digit}</Text>
                        </View>
                      ) : (
                        <Text style={[styles.v2DigitText, { color: theme.colors.textSecondary }]}>{digit}</Text>
                      )}
                    </View>
                  );
                })}
              </Animated.View>
            </Animated.View>
            </GestureDetector>

          </Animated.View>
        ) : (
          <SingleGameContent
            fixture={current.fixture}
            prediction={current.prediction}
            isSaved={current.isSaved}
            groupId={FAKE_GROUP_ID}
            homeRef={homeRef}
            awayRef={awayRef}
            isHomeFocused={false}
            isAwayFocused={false}
            onFieldFocus={noopField}
            onFieldBlur={noopField}
            onUpdatePrediction={noopUpdate}
            onUpdateSliderValue={noopSlider}
            getNextFieldIndex={getNextFieldIndex}
            navigateToField={navigateToField}
            predictionMode={current.predictionMode}
            onSelectOutcome={noopOutcome}
          />
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: 60,
  },
  tabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 11,
    fontWeight: "700",
  },
  modeTitle: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  content: {
    flex: 1,
  },
  v2Container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  v2Card: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  v2SliderStrip: {
    width: 44,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  v2SliderLeft: {
    borderRightWidth: 1,
  },
  v2SliderRight: {
    borderLeftWidth: 1,
  },
  v2Digit: {
    height: 44,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  v2DigitText: {
    fontSize: 15,
    fontWeight: "600",
  },
  v2Thumb: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  v2ThumbText: {
    fontSize: 20,
    fontWeight: "800",
  },
  v2Content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingBottom: 16,
    gap: 12,
  },
  v2InfoPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  v2LogoTopLeft: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 2,
  },
  v2LogoBottomRight: {
    position: "absolute",
    bottom: 8,
    right: 8,
    zIndex: 2,
  },
  v2ScoreCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  v2ExpandedLayer: {
    justifyContent: "flex-start",
  },
  v2ExpandedMatchRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  v2ExpandedTeam: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  v2ExpandedTeamName: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  v2ExpandedScore: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 10,
  },
  exLeagueBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  exBackArrow: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  exBackArrowText: {
    fontSize: 28,
    fontWeight: "300",
    lineHeight: 30,
  },
  exLeagueText: {
    fontWeight: "700",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  exTabsRow: {
    alignSelf: "stretch",
    borderBottomWidth: 1,
    marginTop: 8,
  },
  exTabsScroll: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 12,
  },
  exTab: {
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  exTabActive: {},
  exTabText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  exTabIndicator: {
    height: 3,
    width: "60%",
    borderRadius: 2,
    marginTop: 6,
  },
  exTabContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
});
