// features/groups/group-lobby/components/LobbyPredictionsCTA.tsx
// Lobby predictions CTA - styled to match the Games screen

import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable, Text, Dimensions, ScrollView } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { AppText, TeamLogo, Card } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { isFinished as isFinishedState, isCancelled as isCancelledState, isLive as isLiveState } from "@repo/utils";
import { formatKickoffDate, formatKickoffTime } from "@/utils/fixture";
import type { FixtureItem } from "@/types/common";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.15;

export interface LobbyPredictionsCTAProps {
  predictionsCount: number;
  totalFixtures: number;
  onPress: (fixtureId?: number) => void;
  fixtures?: FixtureItem[];
  isLoading?: boolean;
  winnerName?: string | null;
  winnerPoints?: number | null;
  onWinnerPress?: () => void;
}

const SUCCESS_COLOR = "#10B981";
const MISSED_COLOR = "#EF4444";
const LIVE_COLOR = "#EF4444";


const MAX_VISIBLE_SEGMENTS = 20;
const SEGMENT_WIDTH = 10;
const SEGMENT_GAP = 3;

/** Progress bar slider component - chronological segments */
function ProgressSlider({
  fixtures,
  selectedIndex,
  isTrophySelected,
  theme,
  onSelectIndex,
}: {
  fixtures: FixtureItem[];
  selectedIndex: number;
  isTrophySelected: boolean;
  theme: any;
  onSelectIndex: (index: number) => void;
}) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const DOT_SIZE = 14;
  const DOT_SIZE_SELECTED = 20;
  const GAP = 6;
  const TRACK_HEIGHT = 3;

  // Auto-scroll to center selected segment
  useEffect(() => {
    if (scrollViewRef.current && containerWidth > 0) {
      const scrollX = selectedIndex * (DOT_SIZE + GAP);
      scrollViewRef.current.scrollTo({ x: scrollX, animated: true });
    }
  }, [selectedIndex, containerWidth]);

  const handleLayout = (event: any) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  const sidePadding = containerWidth > 0 ? (containerWidth / 2) - (DOT_SIZE / 2) : 100;

  // Find index of last finished fixture for progress track
  const lastFinishedIndex = fixtures.reduce((lastIdx, fixture, idx) => {
    return isFinishedState(fixture.state) ? idx : lastIdx;
  }, -1);

  // Track calculations - from center of first dot to center of last dot
  const fullTrackWidth = fixtures.length > 1 ? (fixtures.length - 1) * (DOT_SIZE + GAP) : 0;
  const progressWidth = lastFinishedIndex > 0 ? lastFinishedIndex * (DOT_SIZE + GAP) : 0;

  // Track positioning - centered vertically on the dots, starting at center of first dot
  const trackTop = (DOT_SIZE - TRACK_HEIGHT) / 2;
  const trackLeft = DOT_SIZE / 2;

  const renderSegment = (fixture: FixtureItem, index: number) => {
    const isSelected = index === selectedIndex && !isTrophySelected;
    const finished = isFinishedState(fixture.state);
    const cancelled = isCancelledState(fixture.state);
    const prediction = fixture.prediction;
    const hasPoints = (prediction?.points ?? 0) > 0;
    const hasPrediction = prediction?.home != null && prediction?.away != null;

    let backgroundColor: string;
    if (cancelled) {
      backgroundColor = theme.colors.border;
    } else if (finished) {
      backgroundColor = hasPoints ? SUCCESS_COLOR : MISSED_COLOR;
    } else if (hasPrediction) {
      backgroundColor = theme.colors.textSecondary;
    } else {
      backgroundColor = theme.colors.border;
    }

    // Selected dot is larger - we need to offset it to keep centers aligned
    const sizeOffset = isSelected ? (DOT_SIZE_SELECTED - DOT_SIZE) / 2 : 0;

    return (
      <Pressable
        key={index}
        onPress={() => onSelectIndex(index)}
        hitSlop={8}
        style={({ pressed }) => [
          styles.progressDot,
          isSelected && styles.progressDotSelected,
          {
            backgroundColor,
            marginTop: -sizeOffset,
            marginBottom: -sizeOffset,
          },
          pressed && { opacity: 0.7 },
        ]}
      />
    );
  };

  return (
    <View style={styles.progressWrapper} onLayout={handleLayout}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: sidePadding }}>
          {/* Single container with relative positioning */}
          <View style={{ position: "relative" }}>
            {/* Background track - absolute, behind dots */}
            {fullTrackWidth > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: trackTop,
                  left: trackLeft,
                  width: fullTrackWidth,
                  height: TRACK_HEIGHT,
                  backgroundColor: theme.colors.border,
                  borderRadius: TRACK_HEIGHT / 2,
                }}
              />
            )}
            {/* Progress track - absolute, behind dots */}
            {progressWidth > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: trackTop,
                  left: trackLeft,
                  width: progressWidth,
                  height: TRACK_HEIGHT,
                  backgroundColor: theme.colors.primary,
                  borderRadius: TRACK_HEIGHT / 2,
                }}
              />
            )}
            {/* Dots row - this is the layout source */}
            <View style={styles.segmentsRow}>
              {fixtures.map((fixture, index) => renderSegment(fixture, index))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export function LobbyPredictionsCTA({
  predictionsCount,
  totalFixtures,
  onPress,
  fixtures = [],
  isLoading = false,
  winnerName,
  winnerPoints,
  onWinnerPress,
}: LobbyPredictionsCTAProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const skeletonOpacity = useSharedValue(0.3);

  useEffect(() => {
    if (isLoading) {
      skeletonOpacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
    }
  }, [isLoading, skeletonOpacity]);

  const skeletonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: skeletonOpacity.value,
  }));

  // Find initial index - first upcoming game without prediction, or next upcoming game
  const initialSelectedIndex = useMemo(() => {
    if (fixtures.length === 0) return 0;
    const now = Date.now();

    // Find first upcoming game that needs prediction
    const needsPredictionIndex = fixtures.findIndex((fixture) => {
      if (!fixture.kickoffAt) return false;
      const kickoffTime = new Date(fixture.kickoffAt).getTime();
      const isUpcoming = kickoffTime > now;
      const hasPrediction = fixture.prediction?.home != null && fixture.prediction?.away != null;
      return isUpcoming && !hasPrediction;
    });

    if (needsPredictionIndex !== -1) return needsPredictionIndex;

    // Otherwise find first upcoming game
    const upcomingIndex = fixtures.findIndex((fixture) => {
      if (!fixture.kickoffAt) return false;
      const kickoffTime = new Date(fixture.kickoffAt).getTime();
      return kickoffTime > now;
    });

    if (upcomingIndex !== -1) return upcomingIndex;

    // All games finished - show trophy
    return fixtures.length;
  }, [fixtures]);

  const [selectedIndex, setSelectedIndex] = useState<number>(initialSelectedIndex);
  const [hasInitialized, setHasInitialized] = useState<boolean>(false);

  // Sync selectedIndex when fixtures first load
  React.useEffect(() => {
    if (fixtures.length > 0) {
      if (!hasInitialized) {
        setSelectedIndex(initialSelectedIndex);
        setHasInitialized(true);
      } else if (selectedIndex < 0 || selectedIndex > fixtures.length) {
        setSelectedIndex(initialSelectedIndex);
      }
    }
  }, [fixtures.length, selectedIndex, initialSelectedIndex, hasInitialized]);

  const selectedFixture = fixtures[selectedIndex] ?? null;
  const totalDots = fixtures.length + 1; // +1 for trophy
  const isTrophySelected = selectedIndex === fixtures.length;

  const canGoPrevious = selectedIndex > 0;
  const canGoNext = selectedIndex < totalDots - 1;

  // Swipe gesture handling
  const translateX = useSharedValue(0);
  const cardWidth = SCREEN_WIDTH - 96;
  const SLIDE_DURATION = 150;

  const slideToNext = useCallback(() => {
    setSelectedIndex((prev) => Math.min(prev + 1, totalDots - 1));
    translateX.value = cardWidth;
    translateX.value = withTiming(0, { duration: SLIDE_DURATION, easing: Easing.out(Easing.ease) });
  }, [cardWidth, translateX, totalDots]);

  const slideToPrevious = useCallback(() => {
    setSelectedIndex((prev) => Math.max(prev - 1, 0));
    translateX.value = -cardWidth;
    translateX.value = withTiming(0, { duration: SLIDE_DURATION, easing: Easing.out(Easing.ease) });
  }, [cardWidth, translateX]);

  const handlePrevious = useCallback(() => {
    if (canGoPrevious) {
      translateX.value = withTiming(cardWidth, { duration: SLIDE_DURATION }, () => {
        runOnJS(slideToPrevious)();
      });
    }
  }, [canGoPrevious, cardWidth, translateX, slideToPrevious]);

  const handleNext = useCallback(() => {
    if (canGoNext) {
      translateX.value = withTiming(-cardWidth, { duration: SLIDE_DURATION }, () => {
        runOnJS(slideToNext)();
      });
    }
  }, [canGoNext, cardWidth, translateX, slideToNext]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      if (!canGoPrevious && event.translationX > 0) {
        translateX.value = event.translationX * 0.3;
      } else if (!canGoNext && event.translationX < 0) {
        translateX.value = event.translationX * 0.3;
      } else {
        translateX.value = event.translationX;
      }
    })
    .onEnd((event) => {
      const shouldGoNext = event.translationX < -SWIPE_THRESHOLD && canGoNext;
      const shouldGoPrevious = event.translationX > SWIPE_THRESHOLD && canGoPrevious;

      if (shouldGoNext) {
        translateX.value = withTiming(-cardWidth, { duration: SLIDE_DURATION, easing: Easing.in(Easing.ease) }, () => {
          runOnJS(slideToNext)();
        });
      } else if (shouldGoPrevious) {
        translateX.value = withTiming(cardWidth, { duration: SLIDE_DURATION, easing: Easing.in(Easing.ease) }, () => {
          runOnJS(slideToPrevious)();
        });
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  if (isLoading) {
    return (
      <View style={styles.wrapper}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: theme.colors.cardBackground,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {/* Skeleton Button */}
          <Animated.View
            style={[
              styles.skeletonButton,
              { backgroundColor: theme.colors.border },
              skeletonAnimatedStyle,
            ]}
          />

          {/* Skeleton Card */}
          <View style={styles.cardRow}>
            <View style={styles.matchNumberContainer}>
              <Animated.View
                style={[
                  styles.skeletonMatchNumber,
                  { backgroundColor: theme.colors.border },
                  skeletonAnimatedStyle,
                ]}
              />
            </View>
            <View style={styles.cardContainer}>
              <Animated.View
                style={[
                  styles.skeletonLeagueRow,
                  { backgroundColor: theme.colors.border },
                  skeletonAnimatedStyle,
                ]}
              />
              <View
                style={[
                  styles.skeletonMatchCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                {/* Home team row skeleton */}
                <View style={styles.skeletonTeamRow}>
                  <Animated.View
                    style={[
                      styles.skeletonTeamLogo,
                      { backgroundColor: theme.colors.border },
                      skeletonAnimatedStyle,
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.skeletonTeamName,
                      { backgroundColor: theme.colors.border },
                      skeletonAnimatedStyle,
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.skeletonPredictionBox,
                      { backgroundColor: theme.colors.border },
                      skeletonAnimatedStyle,
                    ]}
                  />
                </View>
                {/* Away team row skeleton */}
                <View style={styles.skeletonTeamRow}>
                  <Animated.View
                    style={[
                      styles.skeletonTeamLogo,
                      { backgroundColor: theme.colors.border },
                      skeletonAnimatedStyle,
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.skeletonTeamName,
                      { backgroundColor: theme.colors.border },
                      skeletonAnimatedStyle,
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.skeletonPredictionBox,
                      { backgroundColor: theme.colors.border },
                      skeletonAnimatedStyle,
                    ]}
                  />
                </View>
              </View>
            </View>
            <View style={styles.pointsContainer} />
          </View>

          {/* Skeleton Slider */}
          <View style={styles.sliderRow}>
            <Animated.View
              style={[
                styles.skeletonChevron,
                { backgroundColor: theme.colors.border },
                skeletonAnimatedStyle,
              ]}
            />
            <View style={styles.skeletonProgressRow}>
              <Animated.View
                style={[
                  styles.skeletonProgressTrack,
                  { backgroundColor: theme.colors.border },
                  skeletonAnimatedStyle,
                ]}
              />
            </View>
            <Animated.View
              style={[
                styles.skeletonChevron,
                { backgroundColor: theme.colors.border },
                skeletonAnimatedStyle,
              ]}
            />
          </View>
        </View>
      </View>
    );
  }

  if (fixtures.length === 0) {
    return null;
  }

  // Fixture state helpers
  const isFinished = selectedFixture ? isFinishedState(selectedFixture.state) : false;
  const isCancelled = selectedFixture ? isCancelledState(selectedFixture.state) : false;
  const isLive = selectedFixture ? isLiveState(selectedFixture.state) : false;

  const prediction = selectedFixture?.prediction;
  const hasPrediction = prediction?.home != null && prediction?.away != null;
  const fixturePoints = prediction?.points ?? 0;
  const hasPoints = fixturePoints > 0;

  // Determine card border color for finished games
  const cardBorderColor = isFinished && !isCancelled
    ? (hasPoints ? SUCCESS_COLOR : MISSED_COLOR) + "40"
    : "transparent";
  const cardShadowColor = isFinished && !isCancelled
    ? (hasPoints ? SUCCESS_COLOR : MISSED_COLOR)
    : "#000";

  // Score display
  const homeScore = selectedFixture?.homeScore90 ?? selectedFixture?.homeScore;
  const awayScore = selectedFixture?.awayScore90 ?? selectedFixture?.awayScore;
  const isHomeWinner = homeScore != null && awayScore != null && homeScore > awayScore;
  const isAwayWinner = homeScore != null && awayScore != null && awayScore > homeScore;

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.cardBackground,
            borderColor: theme.colors.border,
          },
        ]}
      >
        {/* Slider */}
        <View style={styles.sliderRowTop}>
          <ProgressSlider
            fixtures={fixtures}
            selectedIndex={selectedIndex}
            isTrophySelected={isTrophySelected}
            theme={theme}
            onSelectIndex={setSelectedIndex}
          />
        </View>

      {/* Card Row */}
      <View style={styles.cardRow}>
        {/* Swipeable Card */}
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.cardContainer, animatedStyle]}>
            {isTrophySelected ? (
              /* Trophy Card */
              <Pressable onPress={onWinnerPress} style={({ pressed }) => pressed && styles.pressed}>
                <View
                  style={[
                    styles.cardShadowWrapper,
                    { shadowColor: "#FFD700", shadowOpacity: 0.3 },
                  ]}
                >
                  <Card style={[styles.matchCard, { backgroundColor: theme.colors.cardBackground }]}>
                    <View style={styles.trophyContent}>
                      <Ionicons name="trophy" size={48} color="#FFD700" />
                      <View style={styles.trophyTextContainer}>
                        <AppText variant="subtitle" style={{ fontWeight: "700" }}>
                          {winnerName ?? t("lobby.groupEnded")}
                        </AppText>
                        {winnerPoints != null && (
                          <AppText variant="caption" color="secondary">
                            {winnerPoints} {t("lobby.pts")}
                          </AppText>
                        )}
                      </View>
                    </View>
                  </Card>
                </View>
              </Pressable>
            ) : selectedFixture ? (
              /* Match Card - styled like GroupGamesScreen */
              <Pressable
                onPress={() => onPress(selectedFixture.id)}
                style={({ pressed }) => pressed && styles.pressed}
              >
                {/* League Info */}
                <View style={styles.leagueInfoRow}>
                  <Text
                    style={[styles.leagueText, { color: theme.colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {selectedFixture.league?.name}
                  </Text>
                  <Text style={[styles.leagueText, { color: theme.colors.textSecondary }]}>
                    {formatKickoffDate(selectedFixture.kickoffAt)} {formatKickoffTime(selectedFixture.kickoffAt)}
                  </Text>
                </View>

                <View
                  style={[
                    styles.cardShadowWrapper,
                    {
                      shadowColor: cardShadowColor,
                      shadowOpacity: isFinished && !isCancelled ? 0.2 : 0.12,
                    },
                  ]}
                >
                  <Card
                    style={[
                      styles.matchCard,
                      {
                        backgroundColor: theme.colors.cardBackground,
                        borderWidth: 1,
                        borderColor: cardBorderColor,
                      },
                    ]}
                  >
                    {/* Home Team Row */}
                    <View style={styles.teamRow}>
                      <View style={styles.teamInfo}>
                        <TeamLogo
                          imagePath={selectedFixture.homeTeam?.imagePath}
                          teamName={selectedFixture.homeTeam?.name ?? ""}
                          size={32}
                          rounded={false}
                        />
                        <Text
                          style={[
                            styles.teamName,
                            { color: theme.colors.textPrimary },
                            isHomeWinner && styles.winnerText,
                          ]}
                          numberOfLines={1}
                        >
                          {selectedFixture.homeTeam?.name ?? ""}
                        </Text>
                      </View>
                      {/* Score */}
                      {(isFinished || isLive) && !isCancelled && (
                        <Text
                          style={[
                            styles.scoreText,
                            { color: isLive ? LIVE_COLOR : theme.colors.textPrimary },
                            isHomeWinner && styles.winnerText,
                          ]}
                        >
                          {homeScore ?? "-"}
                        </Text>
                      )}
                      {/* Prediction */}
                      <View
                        style={[
                          styles.predictionBox,
                          {
                            backgroundColor: isFinished
                              ? hasPoints ? SUCCESS_COLOR + "20" : MISSED_COLOR + "15"
                              : hasPrediction
                                ? "#F1F5F9"
                                : theme.colors.surface,
                            borderColor: isFinished
                              ? hasPoints ? SUCCESS_COLOR + "60" : MISSED_COLOR + "40"
                              : hasPrediction
                                ? "#94A3B8"
                                : theme.colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.predictionText,
                            {
                              color: isFinished
                                ? hasPoints ? SUCCESS_COLOR : MISSED_COLOR
                                : hasPrediction
                                  ? theme.colors.textPrimary
                                  : theme.colors.textSecondary + "80",
                            },
                          ]}
                        >
                          {prediction?.home ?? "–"}
                        </Text>
                      </View>
                    </View>

                    {/* Away Team Row */}
                    <View style={styles.teamRow}>
                      <View style={styles.teamInfo}>
                        <TeamLogo
                          imagePath={selectedFixture.awayTeam?.imagePath}
                          teamName={selectedFixture.awayTeam?.name ?? ""}
                          size={32}
                          rounded={false}
                        />
                        <Text
                          style={[
                            styles.teamName,
                            { color: theme.colors.textPrimary },
                            isAwayWinner && styles.winnerText,
                          ]}
                          numberOfLines={1}
                        >
                          {selectedFixture.awayTeam?.name ?? ""}
                        </Text>
                      </View>
                      {/* Score */}
                      {(isFinished || isLive) && !isCancelled && (
                        <Text
                          style={[
                            styles.scoreText,
                            { color: isLive ? LIVE_COLOR : theme.colors.textPrimary },
                            isAwayWinner && styles.winnerText,
                          ]}
                        >
                          {awayScore ?? "-"}
                        </Text>
                      )}
                      {/* Prediction */}
                      <View
                        style={[
                          styles.predictionBox,
                          {
                            backgroundColor: isFinished
                              ? hasPoints ? SUCCESS_COLOR + "20" : MISSED_COLOR + "15"
                              : hasPrediction
                                ? "#F1F5F9"
                                : theme.colors.surface,
                            borderColor: isFinished
                              ? hasPoints ? SUCCESS_COLOR + "60" : MISSED_COLOR + "40"
                              : hasPrediction
                                ? "#94A3B8"
                                : theme.colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.predictionText,
                            {
                              color: isFinished
                                ? hasPoints ? SUCCESS_COLOR : MISSED_COLOR
                                : hasPrediction
                                  ? theme.colors.textPrimary
                                  : theme.colors.textSecondary + "80",
                            },
                          ]}
                        >
                          {prediction?.away ?? "–"}
                        </Text>
                      </View>
                    </View>
                  </Card>
                </View>
              </Pressable>
            ) : null}
          </Animated.View>
        </GestureDetector>

      </View>

        {/* View All Games Button */}
        <Pressable
          onPress={() => onPress()}
          style={({ pressed }) => [
            styles.viewAllButton,
            {
              backgroundColor: theme.colors.cardBackground,
              borderColor: theme.colors.border,
            },
            pressed && styles.pressed,
          ]}
        >
          <View style={[styles.buttonIconCircle, { backgroundColor: theme.colors.primary + "15" }]}>
            <Ionicons name="football-outline" size={16} color={theme.colors.primary} />
          </View>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            {t("lobby.predictions")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  container: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  buttonIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  viewAllText: {
    fontSize: 15,
    fontWeight: "600",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  matchNumberContainer: {
    width: 36,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  matchNumberText: {
    fontSize: 11,
    fontWeight: "600",
    opacity: 0.7,
  },
  pointsContainer: {
    width: 36,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  pointsNumber: {
    fontSize: 20,
    fontWeight: "800",
  },
  pointsLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    opacity: 0.8,
  },
  sliderRowTop: {
    marginBottom: 12,
  },
  sliderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  sliderChevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  sliderChevronDisabled: {
    opacity: 0.3,
  },
  cardContainer: {
    flex: 1,
  },
  leagueInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  leagueText: {
    fontSize: 11,
    fontWeight: "500",
    opacity: 0.7,
  },
  cardShadowWrapper: {
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  matchCard: {
    marginHorizontal: 0,
    marginBottom: 0,
    padding: 12,
    borderRadius: 10,
    borderWidth: 0,
  },
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  teamInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  teamName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  winnerText: {
    fontWeight: "700",
  },
  scoreText: {
    fontSize: 17,
    fontWeight: "600",
    width: 28,
    textAlign: "center",
  },
  predictionBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  predictionText: {
    fontSize: 18,
    fontWeight: "700",
  },
  trophyContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 8,
  },
  trophyTextContainer: {
    flex: 1,
  },
  progressWrapper: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 12,
    overflow: "visible",
  },
  segmentsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  progressDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#fff",
    elevation: 3,
  },
  progressDotSelected: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
  },
  pressed: {
    opacity: 0.8,
  },
  // Skeleton styles
  skeletonIcon: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  skeletonHeaderText: {
    width: 70,
    height: 12,
    borderRadius: 4,
  },
  skeletonMatchNumber: {
    width: 30,
    height: 12,
    borderRadius: 4,
  },
  skeletonLeagueRow: {
    width: "60%",
    height: 10,
    borderRadius: 4,
    marginBottom: 6,
    marginLeft: 4,
  },
  skeletonMatchCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  skeletonTeamRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  skeletonTeamLogo: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  skeletonTeamName: {
    flex: 1,
    height: 14,
    borderRadius: 4,
  },
  skeletonPredictionBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  skeletonChevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  skeletonProgressRow: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  skeletonProgressTrack: {
    width: "100%",
    height: 6,
    borderRadius: 3,
  },
  skeletonButton: {
    height: 44,
    borderRadius: 12,
    marginTop: 8,
  },
});
