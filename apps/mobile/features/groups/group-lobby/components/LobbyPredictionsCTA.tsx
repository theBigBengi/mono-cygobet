// features/groups/group-lobby/components/LobbyPredictionsCTA.tsx
// Lobby predictions CTA - single "next action" card with progress

import React, { useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { isFinished as isFinishedState, isCancelled as isCancelledState, isLive as isLiveState } from "@repo/utils";
import { formatKickoffTime } from "@/utils/fixture";
import { TeamRow } from "@/features/groups/predictions/components/TeamRow";
import { ResultDisplay } from "@/features/groups/predictions/components/ResultDisplay";
import { getGameResultOrTime, toDisplay } from "@/features/groups/predictions/utils/fixture-helpers";
import type { FixtureItem } from "@/types/common";

export interface LobbyPredictionsCTAProps {
  predictionsCount: number;
  totalFixtures: number;
  onPress: (fixtureId?: number) => void;
  fixtures?: FixtureItem[];
  isLoading?: boolean;
}

const SUCCESS_COLOR = "#10B981";
const MISSED_COLOR = "#EF4444";
const LIVE_COLOR = "#EF4444";

export function LobbyPredictionsCTA({
  predictionsCount,
  totalFixtures,
  onPress,
  fixtures = [],
  isLoading = false,
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

  // Pick the single most relevant fixture to display
  const { relevantFixture, reason } = useMemo(() => {
    if (fixtures.length === 0) return { relevantFixture: null, reason: "none" as const };
    const now = Date.now();

    // 1. First upcoming game without prediction
    const needsPrediction = fixtures.find((fixture) => {
      if (!fixture.kickoffAt) return false;
      const kickoffTime = new Date(fixture.kickoffAt).getTime();
      const isUpcoming = kickoffTime > now;
      const hasPrediction = fixture.prediction?.home != null && fixture.prediction?.away != null;
      return isUpcoming && !hasPrediction;
    });
    if (needsPrediction) return { relevantFixture: needsPrediction, reason: "needsPrediction" as const };

    // 2. First upcoming game
    const upcoming = fixtures.find((fixture) => {
      if (!fixture.kickoffAt) return false;
      return new Date(fixture.kickoffAt).getTime() > now;
    });
    if (upcoming) return { relevantFixture: upcoming, reason: "upcoming" as const };

    // 3. Last fixture (fallback when all finished)
    return { relevantFixture: fixtures[fixtures.length - 1], reason: "finished" as const };
  }, [fixtures]);

  // Dynamic section title based on why this fixture was picked
  const sectionHeaderTitle = useMemo(() => {
    switch (reason) {
      case "needsPrediction": return t("lobby.ctaNeedsPrediction");
      case "upcoming": return t("lobby.ctaUpNext");
      case "finished": return t("lobby.ctaLatestResult");
      default: return "";
    }
  }, [reason, t]);

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
          {/* Skeleton Header */}
          <View style={styles.sectionHeader}>
            <Animated.View
              style={[
                styles.skeletonHeaderTitle,
                { backgroundColor: theme.colors.border },
                skeletonAnimatedStyle,
              ]}
            />
            <Animated.View
              style={[
                styles.skeletonHeaderProgress,
                { backgroundColor: theme.colors.border },
                skeletonAnimatedStyle,
              ]}
            />
          </View>

          {/* Skeleton Card */}
          <View style={styles.cardRow}>
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
          </View>

          {/* Skeleton Button */}
          <Animated.View
            style={[
              styles.skeletonButton,
              { backgroundColor: theme.colors.border },
              skeletonAnimatedStyle,
            ]}
          />
        </View>
      </View>
    );
  }

  const borderBottomColor = theme.colors.textSecondary + "40";
  const primaryIconBg = theme.colors.primary + "15";

  if (fixtures.length === 0 && totalFixtures === 0) {
    return null;
  }

  // Fixture state helpers
  const isFinished = relevantFixture ? isFinishedState(relevantFixture.state) : false;
  const isCancelled = relevantFixture ? isCancelledState(relevantFixture.state) : false;
  const isLive = relevantFixture ? isLiveState(relevantFixture.state) : false;

  const prediction = relevantFixture?.prediction;
  const hasPrediction = prediction?.home != null && prediction?.away != null;
  const fixturePoints = prediction?.points ?? 0;
  const hasPoints = fixturePoints > 0;
  const isMaxPoints = isFinished && fixturePoints >= 3;

  // Game result for ResultDisplay
  const gameResultOrTime = relevantFixture ? getGameResultOrTime(relevantFixture) : null;
  const homeScoreNum = relevantFixture?.homeScore90 ?? relevantFixture?.homeScore;
  const awayScoreNum = relevantFixture?.awayScore90 ?? relevantFixture?.awayScore;
  const isHomeWinner = homeScoreNum != null && awayScoreNum != null && homeScoreNum > awayScoreNum;
  const isAwayWinner = homeScoreNum != null && awayScoreNum != null && awayScoreNum > homeScoreNum;

  // Prediction correctness for ScoreInput styling
  const predictionSuccess = isFinished ? (isMaxPoints ? "max" as const : hasPoints) : undefined;

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.cardBackground,
            borderColor: theme.colors.border,
            borderBottomColor,
          },
        ]}
      >
        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionHeaderTitle, { color: theme.colors.textPrimary }]}>
            {sectionHeaderTitle}
          </Text>
          <Text style={[styles.sectionHeaderProgress, { color: theme.colors.textSecondary }]}>
            {t("lobby.predictionsProgress", { count: predictionsCount, total: totalFixtures })}
          </Text>
        </View>

        {/* Single Match Card */}
        <View style={styles.cardRow}>
          <View style={styles.cardContainer}>
            {relevantFixture ? (
              <Pressable
                onPress={() => onPress(relevantFixture.id)}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Card
                  style={[
                    styles.matchCard,
                    {
                      backgroundColor: theme.colors.cardBackground,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  {/* League info row */}
                  <View style={[styles.gcLeagueRow, { backgroundColor: theme.colors.textSecondary + "08" }]}>
                    {isFinished && !isCancelled ? (
                      <View style={[
                        styles.gcLeagueRightTint,
                        isMaxPoints
                          ? { backgroundColor: SUCCESS_COLOR + "15" }
                          : hasPoints
                            ? { backgroundColor: "#FFB020" + "20" }
                            : { backgroundColor: MISSED_COLOR + "12" },
                      ]} />
                    ) : isLive ? (
                      <View style={[styles.gcLeagueRightTint, { backgroundColor: LIVE_COLOR }]} />
                    ) : null}
                    <View style={styles.gcLeagueLeft}>
                      <Text
                        style={[styles.gcLeagueText, { color: theme.colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {relevantFixture.league?.name}
                      </Text>
                      {(relevantFixture.round || relevantFixture.stage) && (
                        <>
                          <Text style={[styles.gcSeparator, { color: theme.colors.textSecondary }]}>•</Text>
                          <Text style={[styles.gcLeagueText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                            {relevantFixture.round
                              ? isNaN(Number(relevantFixture.round))
                                ? relevantFixture.round.replace(/^Knockout Round\s*/i, "").replace(/^Round of\s*/i, "R")
                                : `R${relevantFixture.round}`
                              : (relevantFixture.stage ?? "").replace(/^Knockout Round\s*/i, "").replace(/^Round of\s*/i, "R")}
                          </Text>
                        </>
                      )}
                    </View>
                    <Text style={[styles.gcLeagueText, isLive ? { color: LIVE_COLOR, fontWeight: "700" } : { color: theme.colors.textSecondary }]}>
                      {isLive ? `${relevantFixture.liveMinute ?? 0}′` : formatKickoffTime(relevantFixture.kickoffAt)}
                    </Text>
                    <View style={[styles.gcLeagueDivider, { backgroundColor: theme.colors.border }]} />
                    {isFinished && !isCancelled ? (
                      <View style={styles.gcPredCol}>
                        <Text style={[
                          styles.gcPointsText,
                          isMaxPoints
                            ? { color: SUCCESS_COLOR }
                            : hasPoints
                              ? { color: "#D4920A" }
                              : { color: MISSED_COLOR },
                        ]}>
                          {hasPoints ? `+${fixturePoints}` : "0"} pts
                        </Text>
                      </View>
                    ) : isLive ? (
                      <View style={styles.gcPredCol}>
                        <Text style={[styles.gcPointsText, { color: "#FFFFFF", fontWeight: "700" }]}>LIVE</Text>
                      </View>
                    ) : (
                      <View style={styles.gcPredCol} />
                    )}
                  </View>

                  <View style={[styles.gcMatchContent, isCancelled && { opacity: 0.6 }]}>
                    <View style={[styles.gcContinuousDivider, { backgroundColor: theme.colors.border }]} />

                    {/* Home Row */}
                    <View style={styles.gcTeamRow}>
                      <View style={styles.gcMatchPressable}>
                        <View style={styles.gcTeamPressable}>
                          <TeamRow
                            team={relevantFixture.homeTeam}
                            teamName={relevantFixture.homeTeam?.name ?? ""}
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
                      </View>
                      <View style={styles.gcPredCol}>
                        <View style={[styles.gcScoreBox, {
                          backgroundColor: predictionSuccess === "max" ? SUCCESS_COLOR + "20"
                            : predictionSuccess === true ? "#FFB020" + "20"
                            : predictionSuccess === false ? MISSED_COLOR + "15"
                            : isLive ? theme.colors.surface
                            : hasPrediction ? theme.colors.surface
                            : theme.colors.surface,
                          borderColor: predictionSuccess === "max" ? SUCCESS_COLOR + "60"
                            : predictionSuccess === true ? "#FFB020" + "60"
                            : predictionSuccess === false ? MISSED_COLOR + "40"
                            : isLive ? "#6B7280"
                            : hasPrediction ? theme.colors.border
                            : theme.colors.border,
                        }]}>
                          <Text style={[styles.gcScoreText, {
                            color: predictionSuccess === "max" ? SUCCESS_COLOR
                              : predictionSuccess === true ? "#D4920A"
                              : predictionSuccess === false ? MISSED_COLOR
                              : hasPrediction ? "#374151"
                              : theme.colors.textSecondary + "80",
                          }]}>
                            {toDisplay(prediction?.home ?? null, isFinished || isLive) || "–"}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Away Row */}
                    <View style={styles.gcTeamRow}>
                      <View style={styles.gcMatchPressable}>
                        <View style={styles.gcTeamPressable}>
                          <TeamRow
                            team={relevantFixture.awayTeam}
                            teamName={relevantFixture.awayTeam?.name ?? ""}
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
                      </View>
                      <View style={styles.gcPredCol}>
                        <View style={[styles.gcScoreBox, {
                          backgroundColor: predictionSuccess === "max" ? SUCCESS_COLOR + "20"
                            : predictionSuccess === true ? "#FFB020" + "20"
                            : predictionSuccess === false ? MISSED_COLOR + "15"
                            : isLive ? theme.colors.surface
                            : hasPrediction ? theme.colors.surface
                            : theme.colors.surface,
                          borderColor: predictionSuccess === "max" ? SUCCESS_COLOR + "60"
                            : predictionSuccess === true ? "#FFB020" + "60"
                            : predictionSuccess === false ? MISSED_COLOR + "40"
                            : isLive ? "#6B7280"
                            : hasPrediction ? theme.colors.border
                            : theme.colors.border,
                        }]}>
                          <Text style={[styles.gcScoreText, {
                            color: predictionSuccess === "max" ? SUCCESS_COLOR
                              : predictionSuccess === true ? "#D4920A"
                              : predictionSuccess === false ? MISSED_COLOR
                              : hasPrediction ? "#374151"
                              : theme.colors.textSecondary + "80",
                          }]}>
                            {toDisplay(prediction?.away ?? null, isFinished || isLive) || "–"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </Card>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* View All Games Button */}
        <Pressable
          onPress={() => onPress()}
          style={({ pressed }) => [
            styles.viewAllButton,
            {
              backgroundColor: theme.colors.cardBackground,
              borderColor: theme.colors.border,
              borderBottomColor,
              transform: [{ scale: pressed ? 0.96 : 1 }, { translateY: pressed ? 2 : 0 }],
            },
            pressed && styles.pressed,
          ]}
        >
          <View style={[styles.buttonIconCircle, { backgroundColor: primaryIconBg }]}>
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
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  container: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderBottomWidth: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  sectionHeaderProgress: {
    fontSize: 12,
    fontWeight: "500",
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
    borderBottomWidth: 3,
  },
  buttonIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  cardContainer: {
    flex: 1,
  },
  matchCard: {
    marginHorizontal: 0,
    marginBottom: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  // Games-card league info row
  gcLeagueRow: {
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
  gcLeagueRightTint: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: 72,
    borderTopRightRadius: 10,
  },
  gcLeagueLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  gcLeagueText: {
    fontSize: 11,
    fontWeight: "500",
    opacity: 0.7,
  },
  gcSeparator: {
    fontSize: 11,
    opacity: 0.4,
    marginHorizontal: -3,
  },
  gcLeagueDivider: {
    width: 1,
    alignSelf: "stretch",
    marginVertical: -6,
    opacity: 0.5,
  },
  gcPredCol: {
    width: 52,
    alignItems: "center",
  },
  gcPointsText: {
    fontSize: 11,
    fontWeight: "700",
  },
  gcMatchContent: {
    flexDirection: "column",
    gap: 6,
  },
  gcContinuousDivider: {
    position: "absolute",
    width: 1,
    top: 0,
    bottom: 0,
    right: 60,
    opacity: 0.5,
  },
  gcTeamRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  gcMatchPressable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  gcTeamPressable: {
    flex: 1,
  },
  gcScoreBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  gcScoreText: {
    fontSize: 18,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.8,
  },
  // Skeleton styles
  skeletonHeaderTitle: {
    width: 110,
    height: 14,
    borderRadius: 4,
  },
  skeletonHeaderProgress: {
    width: 80,
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
    width: 30,
    height: 30,
    borderRadius: 6,
  },
  skeletonTeamName: {
    flex: 1,
    height: 14,
    borderRadius: 4,
  },
  skeletonPredictionBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  skeletonButton: {
    height: 44,
    borderRadius: 12,
    marginTop: 12,
  },
});
