// features/groups/group-lobby/components/LobbyPredictionsCTA.tsx
// Lobby predictions CTA - styled to match the Games screen

import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable, Text, Dimensions, ScrollView } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { AppText, TeamLogo, Card } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { isFinished as isFinishedState, isCancelled as isCancelledState, isLive as isLiveState } from "@repo/utils";
import { formatKickoffDate, formatKickoffTime } from "@/utils/fixture";
import { LobbyCardSkeleton } from "./LobbyCardSkeleton";
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

const DOT_SIZE = 8;
const DOT_SIZE_ACTIVE = 16;
const DOT_GAP = 10;
const MAX_VISIBLE_DOTS = 10;
const DOT_TOTAL_WIDTH = DOT_SIZE + DOT_GAP;

/** Scrollable dots slider component */
function DotsSlider({
  fixtures,
  selectedIndex,
  isTrophySelected,
  theme,
}: {
  fixtures: FixtureItem[];
  selectedIndex: number;
  isTrophySelected: boolean;
  theme: any;
}) {
  const scrollViewRef = useRef<ScrollView>(null);
  const totalItems = fixtures.length + 1; // +1 for trophy

  // Scroll to keep selected dot centered
  useEffect(() => {
    if (scrollViewRef.current && totalItems > MAX_VISIBLE_DOTS) {
      const scrollX = Math.max(0, (selectedIndex - Math.floor(MAX_VISIBLE_DOTS / 2)) * DOT_TOTAL_WIDTH);
      scrollViewRef.current.scrollTo({ x: scrollX, animated: true });
    }
  }, [selectedIndex, totalItems]);

  const containerWidth = Math.min(totalItems, MAX_VISIBLE_DOTS) * DOT_TOTAL_WIDTH;

  return (
    <View style={[styles.progressRow, { width: containerWidth }]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        contentContainerStyle={styles.dotsContainer}
      >
        {fixtures.map((fixture, index) => {
          const fixtureFinished = isFinishedState(fixture.state);
          const fixtureCancelled = isCancelledState(fixture.state);
          const fixturePrediction = fixture.prediction;
          const fixtureHasPoints = (fixturePrediction?.points ?? 0) > 0;
          const isSelected = index === selectedIndex;

          let dotColor = theme.colors.border;
          if (fixtureCancelled) {
            dotColor = theme.colors.border;
          } else if (fixtureFinished) {
            dotColor = fixtureHasPoints ? SUCCESS_COLOR : MISSED_COLOR;
          } else if (fixturePrediction?.home != null && fixturePrediction?.away != null) {
            dotColor = theme.colors.textSecondary;
          }

          return (
            <View
              key={index}
              style={[
                styles.progressDot,
                { backgroundColor: dotColor },
                isSelected && styles.progressDotActive,
              ]}
            >
              {isSelected && (
                <Text style={styles.dotNumber}>
                  {index + 1}
                </Text>
              )}
            </View>
          );
        })}
        {/* Trophy dot */}
        <View
          style={[
            styles.progressDot,
            {
              backgroundColor: isTrophySelected
                ? "#FFD700"
                : theme.colors.border,
            },
            isTrophySelected && styles.progressDotActive,
          ]}
        />
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
    return <LobbyCardSkeleton height={200} />;
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
    <View style={[styles.container, { borderColor: theme.colors.border }]}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Ionicons name="football-outline" size={16} color={theme.colors.textSecondary} />
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
          {t("lobby.predictions")}
        </Text>
      </View>

      {/* Card Row: Number + Card + Points */}
      <View style={styles.cardRow}>
        {/* Left: Match number */}
        <View style={styles.matchNumberContainer}>
          <Text style={[styles.matchNumberText, { color: theme.colors.textSecondary }]}>
            {isTrophySelected ? `${fixtures.length}/${fixtures.length}` : `${selectedIndex + 1}/${fixtures.length}`}
          </Text>
        </View>

        {/* Center: Swipeable Card */}
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

        {/* Right: Points for finished games */}
        <View style={styles.pointsContainer}>
          {isFinished && !isCancelled && !isTrophySelected ? (
            <>
              <Text style={[styles.pointsNumber, { color: hasPoints ? SUCCESS_COLOR : MISSED_COLOR }]}>
                {hasPoints ? `+${fixturePoints}` : "0"}
              </Text>
              <Text style={[styles.pointsLabel, { color: theme.colors.textSecondary }]}>
                pts
              </Text>
            </>
          ) : null}
        </View>
      </View>

      {/* Slider row: Chevron + Dots + Chevron */}
      <View style={styles.sliderRow}>
        <Pressable
          onPress={handlePrevious}
          disabled={!canGoPrevious}
          style={[styles.sliderChevron, !canGoPrevious && styles.sliderChevronDisabled]}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={canGoPrevious ? theme.colors.textSecondary : theme.colors.border}
          />
        </Pressable>

        <DotsSlider
          fixtures={fixtures}
          selectedIndex={selectedIndex}
          isTrophySelected={isTrophySelected}
          theme={theme}
        />

        <Pressable
          onPress={handleNext}
          disabled={!canGoNext}
          style={[styles.sliderChevron, !canGoNext && styles.sliderChevronDisabled]}
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={canGoNext ? theme.colors.textSecondary : theme.colors.border}
          />
        </Pressable>
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
        <Text style={[styles.viewAllText, { color: theme.colors.textPrimary }]}>
          {t("lobby.viewAllGames")}
        </Text>
        <Ionicons name="arrow-forward" size={18} color={theme.colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
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
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  viewAllText: {
    fontSize: 15,
    fontWeight: "600",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  matchNumberContainer: {
    width: 48,
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
    width: 48,
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
  sliderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  sliderChevron: {
    padding: 8,
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
  progressRow: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  dotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: DOT_GAP,
  },
  dotNumber: {
    fontSize: 8,
    fontWeight: "600",
    color: "#fff",
    opacity: 0.8,
  },
  progressDot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
  },
  progressDotActive: {
    width: DOT_SIZE_ACTIVE,
    height: DOT_SIZE_ACTIVE,
    borderRadius: DOT_SIZE_ACTIVE / 2,
  },
  pressed: {
    opacity: 0.8,
  },
});
