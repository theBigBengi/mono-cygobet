// features/groups/group-lobby/components/LobbyPredictionsCTA.tsx

import React, { useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable, Dimensions } from "react-native";
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
import { AppText, TeamLogo, GamesTimeline, type TimelineGame } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { isFinished as isFinishedState, isCancelled as isCancelledState } from "@repo/utils";
import { formatCountdown } from "@/features/groups/predictions/utils/formatCountdown";
import { formatKickoffDate, formatKickoffTime } from "@/utils/fixture";
import { LobbyCardSkeleton } from "./LobbyCardSkeleton";
import type { FixtureItem } from "@/types/common";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.2;

export interface LobbyPredictionsCTAProps {
  predictionsCount: number;
  totalFixtures: number;
  /** Callback when button is pressed, receives the selected fixture ID */
  onPress: (fixtureId?: number) => void;
  fixtures?: FixtureItem[];
  isLoading?: boolean;
  /** Winner name to show when trophy is selected */
  winnerName?: string | null;
  /** Winner points to show when trophy is selected */
  winnerPoints?: number | null;
  /** Callback when winner button is pressed */
  onWinnerPress?: () => void;
}

const LOGO_SIZE = 50;

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
  const progress =
    totalFixtures > 0 ? Math.min(1, predictionsCount / totalFixtures) : 0;

  const timelineGames = useMemo((): TimelineGame[] => {
    return fixtures.map((fixture) => {
      const prediction = fixture.prediction;
      const hasPrediction = Boolean(
        prediction && prediction.home != null && prediction.away != null
      );
      const hasPoints = Boolean(prediction?.points != null && prediction.points > 0);
      const isFinished = isFinishedState(fixture.state);
      const isCancelled = isCancelledState(fixture.state);

      let type: TimelineGame["type"];
      if (isCancelled) {
        type = "cancelled";
      } else if (isFinished) {
        type = hasPoints ? "success" : "missed";
      } else {
        type = hasPrediction ? "waiting" : "upcoming";
      }

      return {
        id: String(fixture.id),
        type,
        homeTeam: fixture.homeTeam?.name ?? "",
        awayTeam: fixture.awayTeam?.name ?? "",
        countdown: formatCountdown(fixture.kickoffAt, t),
        score: isFinished
          ? { home: fixture.homeScore90 ?? 0, away: fixture.awayScore90 ?? 0 }
          : null,
        prediction:
          hasPrediction && prediction
            ? { home: String(prediction.home), away: String(prediction.away) }
            : null,
        statusLabel: isCancelled ? fixture.state : null,
      };
    });
  }, [fixtures, t]);

  const initialSelectedIndex = useMemo(() => {
    if (fixtures.length === 0) return 0;
    const now = Date.now();

    // Find all upcoming games (kickoff hasn't passed yet)
    const upcomingGames = fixtures
      .map((f, index) => ({ fixture: f, index }))
      .filter(({ fixture }) => {
        if (!fixture.kickoffAt) return false;
        const kickoffTime = new Date(fixture.kickoffAt).getTime();
        return kickoffTime > now;
      });

    if (upcomingGames.length === 0) {
      // All games have passed, show the trophy dot (index after last game)
      return fixtures.length;
    }

    // Sort by kickoff time, then by id for consistent ordering
    upcomingGames.sort((a, b) => {
      const timeA = new Date(a.fixture.kickoffAt!).getTime();
      const timeB = new Date(b.fixture.kickoffAt!).getTime();
      if (timeA !== timeB) return timeA - timeB;
      return a.fixture.id - b.fixture.id;
    });

    return upcomingGames[0].index;
  }, [fixtures]);

  const [selectedIndex, setSelectedIndex] = useState<number>(initialSelectedIndex);
  const [hasInitialized, setHasInitialized] = useState<boolean>(false);

  // Sync selectedIndex when fixtures first load or change significantly
  React.useEffect(() => {
    if (timelineGames.length > 0) {
      if (!hasInitialized) {
        // First time fixtures loaded - jump to the correct initial position
        setSelectedIndex(initialSelectedIndex);
        setHasInitialized(true);
      } else if (selectedIndex < 0 || selectedIndex >= timelineGames.length) {
        // Index out of bounds - reset to initial
        setSelectedIndex(initialSelectedIndex);
      }
    }
  }, [timelineGames.length, selectedIndex, initialSelectedIndex, hasInitialized]);

  const selectedFixture = fixtures[selectedIndex] ?? null;
  const selectedGame = timelineGames[selectedIndex] ?? null;

  const handleGameSelect = useCallback((_game: TimelineGame | undefined, index: number) => {
    setSelectedIndex(index);
  }, []);

  const handlePrevious = useCallback(() => {
    if (selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  }, [selectedIndex]);

  // Total dots including trophy
  const totalDots = timelineGames.length + 1; // +1 for trophy

  const handleNext = useCallback(() => {
    if (selectedIndex < totalDots - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  }, [selectedIndex, totalDots]);

  const canGoPrevious = selectedIndex > 0;
  const canGoNext = selectedIndex < totalDots - 1;
  const isTrophySelected = selectedIndex === timelineGames.length;

  // Swipe gesture handling with proper slide animation
  const translateX = useSharedValue(0);
  const cardWidth = SCREEN_WIDTH - 80; // Approximate card width (minus chevrons)
  const SLIDE_DURATION = 150;

  const slideToNext = useCallback(() => {
    setSelectedIndex((prev) => prev + 1);
    // Position new card from the right and slide in
    translateX.value = cardWidth;
    translateX.value = withTiming(0, { duration: SLIDE_DURATION, easing: Easing.out(Easing.ease) });
  }, [cardWidth, translateX]);

  const slideToPrevious = useCallback(() => {
    setSelectedIndex((prev) => prev - 1);
    // Position new card from the left and slide in
    translateX.value = -cardWidth;
    translateX.value = withTiming(0, { duration: SLIDE_DURATION, easing: Easing.out(Easing.ease) });
  }, [cardWidth, translateX]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      // Limit drag when at boundaries
      if (!canGoPrevious && event.translationX > 0) {
        translateX.value = event.translationX * 0.3; // Resistance
      } else if (!canGoNext && event.translationX < 0) {
        translateX.value = event.translationX * 0.3; // Resistance
      } else {
        translateX.value = event.translationX;
      }
    })
    .onEnd((event) => {
      const shouldGoNext = event.translationX < -SWIPE_THRESHOLD && canGoNext;
      const shouldGoPrevious = event.translationX > SWIPE_THRESHOLD && canGoPrevious;

      if (shouldGoNext) {
        // Slide out to left
        translateX.value = withTiming(-cardWidth, { duration: SLIDE_DURATION, easing: Easing.in(Easing.ease) }, () => {
          runOnJS(slideToNext)();
        });
      } else if (shouldGoPrevious) {
        // Slide out to right
        translateX.value = withTiming(cardWidth, { duration: SLIDE_DURATION, easing: Easing.in(Easing.ease) }, () => {
          runOnJS(slideToPrevious)();
        });
      } else {
        // Bounce back
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Build prediction label for timeline (must be before conditional return)
  const predictionLabel = useMemo(() => {
    const prediction = selectedFixture?.prediction;
    if (prediction?.home == null || prediction?.away == null) {
      return t("lobby.noPrediction");
    }
    const pred = `${prediction.home}-${prediction.away}`;
    const points = prediction.points;
    if (points != null && points > 0) {
      return `${pred} | +${points}`;
    }
    return pred;
  }, [selectedFixture, t]);

  if (isLoading) {
    return <LobbyCardSkeleton height={320} />;
  }

  const hasGames = timelineGames.length > 0;
  const isFinished = selectedGame?.type === "success" || selectedGame?.type === "missed";
  const isCancelled = selectedGame?.type === "cancelled";

  const kickoffLabel = selectedFixture
    ? `${formatKickoffDate(selectedFixture.kickoffAt)} ${formatKickoffTime(selectedFixture.kickoffAt)}`
    : "";

  return (
    <View style={styles.section}>
      <AppText
        variant="caption"
        color="secondary"
        style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}
      >
        {t("lobby.predictions")}
      </AppText>
      <View style={[styles.wrapper, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.content}>
        {hasGames && (isTrophySelected || selectedFixture) && (
          <>
            {/* Navigation Row with Chevrons */}
            <View style={styles.navigationRow}>
              {/* Left Chevron */}
              <Pressable
                onPress={handlePrevious}
                style={[styles.chevronButton, !canGoPrevious && styles.chevronDisabled]}
                disabled={!canGoPrevious}
              >
                <Ionicons
                  name="chevron-back"
                  size={24}
                  color={canGoPrevious ? theme.colors.border : theme.colors.border + "50"}
                />
              </Pressable>

              {/* Swipeable Match Card Only */}
              <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.matchRow, animatedStyle]}>
                  {isTrophySelected ? (
                    /* Trophy View */
                    <View style={styles.trophyContainer}>
                      <Ionicons
                        name="trophy"
                        size={40}
                        color={theme.colors.warning}
                      />
                      <AppText
                        variant="subtitle"
                        style={[styles.trophyTitle, { color: theme.colors.textPrimary }]}
                      >
                        {t("lobby.groupEnded")}
                      </AppText>
                    </View>
                  ) : selectedFixture ? (
                    <>
                      {/* Home Team */}
                      <View style={styles.teamColumn}>
                        <TeamLogo
                          imagePath={selectedFixture.homeTeam?.imagePath ?? null}
                          teamName={selectedFixture.homeTeam?.name ?? ""}
                          size={LOGO_SIZE}
                          rounded={false}
                        />
                        <AppText
                          numberOfLines={1}
                          style={[styles.teamName, { color: theme.colors.textPrimary }]}
                        >
                          {selectedFixture.homeTeam?.name ?? ""}
                        </AppText>
                      </View>

                      {/* Center: Date + Score + Status */}
                      <View style={styles.centerColumn}>
                        <AppText style={[styles.dateTime, { color: theme.colors.textSecondary }]}>
                          {kickoffLabel}
                        </AppText>
                        <View style={styles.scoreContainer}>
                          {isFinished && selectedGame?.score ? (
                            <>
                              <AppText style={[styles.score, { color: theme.colors.textPrimary }]}>
                                {selectedGame.score.home}-{selectedGame.score.away}
                              </AppText>
                              <AppText style={[styles.statusLabel, { color: theme.colors.textSecondary }]}>
                                {t("lobby.finished", "Finished")}
                              </AppText>
                            </>
                          ) : isCancelled ? (
                            <AppText style={[styles.statusLabel, { color: theme.colors.textSecondary }]}>
                              {selectedGame?.statusLabel ?? "Cancelled"}
                            </AppText>
                          ) : (
                            <AppText style={[styles.versus, { color: theme.colors.textPrimary }]}>
                              -
                            </AppText>
                          )}
                        </View>
                      </View>

                      {/* Away Team */}
                      <View style={styles.teamColumn}>
                        <TeamLogo
                          imagePath={selectedFixture.awayTeam?.imagePath ?? null}
                          teamName={selectedFixture.awayTeam?.name ?? ""}
                          size={LOGO_SIZE}
                          rounded={false}
                        />
                        <AppText
                          numberOfLines={1}
                          style={[styles.teamName, { color: theme.colors.textPrimary }]}
                        >
                          {selectedFixture.awayTeam?.name ?? ""}
                        </AppText>
                      </View>
                    </>
                  ) : null}
                </Animated.View>
              </GestureDetector>

              {/* Right Chevron */}
              <Pressable
                onPress={handleNext}
                style={[styles.chevronButton, !canGoNext && styles.chevronDisabled]}
                disabled={!canGoNext}
              >
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={canGoNext ? theme.colors.border : theme.colors.border + "50"}
                />
              </Pressable>
            </View>

            {/* Timeline - stays in place */}
            <View style={styles.timelineContainer}>
              <GamesTimeline
                games={timelineGames}
                selectedIndex={selectedIndex}
                onGameSelect={handleGameSelect}
                hideLabels
                dotSize={18}
                dotGap={18}
                showTrophyEnd
              />
            </View>

            {/* Winner Button - show when trophy is selected */}
            {isTrophySelected && winnerName && onWinnerPress && (
              <Pressable
                onPress={onWinnerPress}
                style={({ pressed }) => [
                  styles.predictionButton,
                  { backgroundColor: theme.colors.background },
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.predictionButtonRow}>
                  <View style={styles.predictionContent}>
                    <Ionicons
                      name="ribbon"
                      size={20}
                      color={theme.colors.warning}
                      style={styles.predictionIcon}
                    />
                    <AppText style={[styles.predictionValue, { color: theme.colors.textPrimary }]}>
                      {winnerName}
                    </AppText>
                    {winnerPoints != null && (
                      <AppText style={[styles.predictionPoints, { color: theme.colors.textSecondary }]}>
                        {winnerPoints} {t("lobby.pts")}
                      </AppText>
                    )}
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={theme.colors.textSecondary}
                    style={styles.predictionArrow}
                  />
                </View>
              </Pressable>
            )}

            {/* Prediction Button - hide when trophy is selected */}
            {!isTrophySelected && (
              selectedFixture?.prediction?.home != null &&
              selectedFixture?.prediction?.away != null ? (
                <Pressable
                  onPress={() => onPress(selectedFixture?.id)}
                  style={({ pressed }) => [
                    styles.predictionButton,
                    {
                      backgroundColor: "transparent",
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.predictionButtonSpaced}>
                    <View style={styles.predictionLeft}>
                      <AppText
                        variant="caption"
                        color="secondary"
                        style={styles.predictionTitle}
                      >
                        {t("lobby.myPrediction")}
                      </AppText>
                      <AppText style={[styles.predictionValue, { color: theme.colors.textPrimary }]}>
                        {selectedFixture.prediction.home}-{selectedFixture.prediction.away}
                      </AppText>
                    </View>
                    <View style={styles.predictionRight}>
                      {isFinished && selectedFixture.prediction.points != null && (
                        <AppText
                          style={[
                            styles.predictionPoints,
                            {
                              color: selectedFixture.prediction.points > 0
                                ? theme.colors.success
                                : theme.colors.danger,
                            },
                          ]}
                        >
                          {selectedFixture.prediction.points > 0
                            ? `+${selectedFixture.prediction.points} ${t("lobby.pts")}`
                            : `${selectedFixture.prediction.points} ${t("lobby.pts")}`}
                        </AppText>
                      )}
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={theme.colors.textSecondary}
                      />
                    </View>
                  </View>
                </Pressable>
              ) : isFinished || isCancelled ? (
                <Pressable
                  onPress={() => onPress(selectedFixture?.id)}
                  style={({ pressed }) => [
                    styles.predictionButton,
                    {
                      backgroundColor: "transparent",
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.predictionButtonRow}>
                    <View style={styles.predictionContent}>
                      <AppText style={[styles.predictionMissed, { color: theme.colors.textSecondary }]}>
                        {t("lobby.noPrediction")}
                      </AppText>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={theme.colors.textSecondary}
                      style={styles.predictionArrow}
                    />
                  </View>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => onPress(selectedFixture?.id)}
                  style={({ pressed }) => [
                    styles.predictionButton,
                    {
                      backgroundColor: "transparent",
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.predictionButtonRow}>
                    <View style={styles.predictionContent}>
                      <Ionicons
                        name="add-circle-outline"
                        size={20}
                        color={theme.colors.primary}
                        style={styles.predictionIcon}
                      />
                      <AppText style={[styles.predictionPlaceholder, { color: theme.colors.primary }]}>
                        {t("lobby.addPrediction")}
                      </AppText>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={theme.colors.textSecondary}
                      style={styles.predictionArrow}
                    />
                  </View>
                </Pressable>
              )
            )}
          </>
        )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 0,
  },
  sectionTitle: {
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingVertical: 8,
  },
  wrapper: {
    borderRadius: 0,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  navigationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  chevronButton: {
    padding: 4,
  },
  chevronDisabled: {
    opacity: 0.3,
  },
  matchRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  teamColumn: {
    alignItems: "center",
    width: 70,
  },
  teamName: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
  },
  centerColumn: {
    alignItems: "center",
    justifyContent: "flex-start",
    minHeight: 70,
  },
  trophyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 86, // Match the height of team columns (logo 50 + margin 8 + text ~28)
  },
  trophyTitle: {
    marginTop: 8,
    fontWeight: "600",
  },
  dateTime: {
    fontSize: 11,
    marginBottom: 2,
  },
  scoreContainer: {
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  score: {
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34,
  },
  statusLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  predictionLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  versus: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 34,
  },
  timelineContainer: {
    marginBottom: 12,
  },
  predictionButton: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  predictionButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  predictionButtonSpaced: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  predictionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  predictionRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  predictionArrow: {
    position: "absolute",
    right: 0,
  },
  predictionContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  predictionTitle: {
    fontSize: 12,
  },
  predictionValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  predictionPoints: {
    fontSize: 14,
    fontWeight: "600",
  },
  predictionIcon: {
    marginRight: 2,
  },
  predictionPlaceholder: {
    fontSize: 14,
    fontWeight: "600",
  },
  predictionMissed: {
    fontSize: 14,
    fontWeight: "500",
  },
  pressed: {
    opacity: 0.8,
  },
});
