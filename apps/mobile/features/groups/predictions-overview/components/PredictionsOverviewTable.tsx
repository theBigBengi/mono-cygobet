import React, { useRef, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  Dimensions,
  Pressable,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { useAuth } from "@/lib/auth/useAuth";
import type { ApiPredictionsOverviewData } from "@repo/types";
import {
  calculateLivePoints,
  formatDate,
  getWinner,
  hasMatchStarted,
} from "./utils";

const SCREEN_WIDTH = Dimensions.get("window").width;

interface PredictionsOverviewTableProps {
  data: ApiPredictionsOverviewData;
  groupId: number | null;
}

const LEFT_COLUMN_WIDTH = 134;
const TOTAL_COLUMN_WIDTH = 50;
const GAME_COLUMN_WIDTH = 50;
const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 110;

export function PredictionsOverviewTable({
  data,
  groupId,
}: PredictionsOverviewTableProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const rightFlatListRef = useRef<FlatList>(null);
  const horizontalScrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  const translateY = scrollY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -1],
  });

  const { participants, fixtures, predictions, predictionPoints } = data;
  const currentUserId = user?.id ?? null;

  const liveFixtures = fixtures.filter((f) => f.liveMinute != null);
  const hasLive = liveFixtures.length > 0;
  const [showLivePoints, setShowLivePoints] = useState(hasLive);

  const getPrediction = (userId: number, fixtureId: number): string | null => {
    return predictions[`${userId}_${fixtureId}`] ?? null;
  };

  const getPoints = (userId: number, fixtureId: number): string | null => {
    return predictionPoints[`${userId}_${fixtureId}`] ?? null;
  };

  // Pre-compute live bonus points per participant
  const liveBonusMap = useMemo(() => {
    if (!hasLive) return new Map<number, number>();
    const map = new Map<number, number>();
    for (const p of participants) {
      let bonus = 0;
      for (const f of liveFixtures) {
        const pred = predictions[`${p.id}_${f.id}`] ?? null;
        const pts = calculateLivePoints(pred, f.homeScore90, f.awayScore90);
        bonus += pts ? parseInt(pts, 10) : 0;
      }
      map.set(p.id, bonus);
    }
    return map;
  }, [hasLive, participants, liveFixtures, predictions]);

  // Sort participants by live-adjusted points when in Live mode
  const sortedParticipants = useMemo(() => {
    if (!showLivePoints) return participants;
    return [...participants].sort((a, b) => {
      const aTotal = a.totalPoints + (liveBonusMap.get(a.id) ?? 0);
      const bTotal = b.totalPoints + (liveBonusMap.get(b.id) ?? 0);
      return bTotal - aTotal;
    });
  }, [showLivePoints, participants, liveBonusMap]);

  // Map of userId -> position change (positive = moved up, negative = moved down)
  const positionChangeMap = useMemo(() => {
    if (!showLivePoints) return new Map<number, number>();
    const map = new Map<number, number>();
    const originalPos = new Map(participants.map((p, i) => [p.id, i]));
    sortedParticipants.forEach((p, newIndex) => {
      const oldIndex = originalPos.get(p.id) ?? newIndex;
      map.set(p.id, oldIndex - newIndex); // positive = moved up
    });
    return map;
  }, [showLivePoints, participants, sortedParticipants]);

  const getPointsColor = (points: string | null): string => {
    if (!points) return theme.colors.textSecondary;
    const n = parseInt(points, 10);
    if (n >= 3) return "#10B981";
    if (n >= 2) return "#F59E0B";
    if (n >= 1) return "#E8A308";
    return theme.colors.danger;
  };

  const getPointsCellBg = (points: string | null): string | undefined => {
    if (!points) return undefined;
    const n = parseInt(points, 10);
    if (n >= 3) return "#10B98108";
    if (n >= 2) return "#F59E0B08";
    if (n >= 1) return "#E8A30808";
    return theme.colors.danger + "08";
  };

  const formatPrediction = (
    prediction: string | null,
    userId: number,
    fixtureId: number
  ): string => {
    // If it's the current user, always show their prediction (or "-:-" if none)
    if (userId === currentUserId) {
      return prediction ? prediction.replace(":", "-") : "-:-";
    }

    // For other users, check if match has started
    const fixture = fixtures.find((f) => f.id === fixtureId);
    if (!fixture) return "-:-";

    const hasStarted = hasMatchStarted(
      fixture.state,
      fixture.result,
      fixture.startTs
    );

    // If match hasn't started, show "?"
    if (!hasStarted) {
      return "?";
    }

    // If match has started, show prediction or "-:-"
    return prediction ? prediction.replace(":", "-") : "-:-";
  };

  // Calculate available width for the right section (screen - left column)
  const availableWidth = SCREEN_WIDTH - LEFT_COLUMN_WIDTH;
  const minTotalWidth =
    TOTAL_COLUMN_WIDTH + fixtures.length * GAME_COLUMN_WIDTH;

  // If content is narrower than screen, expand columns to fill
  const shouldExpand = minTotalWidth < availableWidth && fixtures.length > 0;
  const actualGameColumnWidth = shouldExpand
    ? (availableWidth - TOTAL_COLUMN_WIDTH) / fixtures.length
    : GAME_COLUMN_WIDTH;
  const totalWidth =
    TOTAL_COLUMN_WIDTH + fixtures.length * actualGameColumnWidth;

  // Render header row - inside horizontal scroll
  const renderHeader = () => {
    return (
      <View
        style={[
          styles.matchHeaderRow,
          {
            minWidth: totalWidth,
            height: HEADER_HEIGHT,
            backgroundColor: theme.colors.background,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        {/* Total Points header — first scrollable column */}
        <Pressable
          onPress={hasLive ? () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowLivePoints((v) => !v);
          } : undefined}
          style={[
            styles.gameHeader,
            styles.totalPointsHeader,
            {
              width: TOTAL_COLUMN_WIDTH,
              borderRightWidth: StyleSheet.hairlineWidth,
              borderRightColor: theme.colors.border,
              backgroundColor: showLivePoints ? theme.colors.primary + "08" : "transparent",
            },
          ]}
        >
          {hasLive && (
            <Ionicons
              name={showLivePoints ? "toggle" : "toggle-outline"}
              size={18}
              color={showLivePoints ? theme.colors.primary : theme.colors.textSecondary}
            />
          )}
          <AppText variant="caption" style={[styles.totalPointsHeaderText, { color: showLivePoints ? theme.colors.primary : theme.colors.textSecondary }]}>
            {showLivePoints ? "Live" : "Pts"}
          </AppText>
        </Pressable>
        {/* Fixture columns */}
        {fixtures.map((fixture) => (
          <Pressable
            key={fixture.id}
            style={({ pressed }) => [
              styles.gameHeader,
              {
                width: actualGameColumnWidth,
                backgroundColor: pressed
                  ? theme.colors.textPrimary + "06"
                  : fixture.liveMinute != null
                    ? theme.colors.primary + "06"
                    : "transparent",
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (groupId != null) {
                router.push(`/groups/${groupId}/fixtures/${fixture.id}`);
              }
            }}
          >
            {/* Column layout: Home Logo, Home Abbr, Away Abbr, Away Logo, Result */}
            <View style={styles.gameHeaderColumn}>
              {(() => {
                const winner = getWinner(fixture);
                const isHomeLoser = winner === "away";
                return (
                  <View
                    style={isHomeLoser ? styles.logoContainerDimmed : undefined}
                  >
                    <TeamLogo
                      imagePath={fixture.homeTeam.imagePath}
                      teamName={fixture.homeTeam.name}
                      size={20}
                    />
                  </View>
                );
              })()}
              {(() => {
                const winner = getWinner(fixture);
                const isHomeWinner = winner === "home";
                const matchStarted = hasMatchStarted(
                  fixture.state,
                  fixture.result,
                  fixture.startTs
                );
                const isNotStarted = !matchStarted;
                return (
                  <AppText
                    variant="caption"
                    color={
                      isHomeWinner
                        ? "primary"
                        : isNotStarted
                          ? "primary"
                          : "secondary"
                    }
                    style={[
                      styles.teamAbbr,
                      isHomeWinner && styles.teamAbbrWinner,
                    ]}
                    numberOfLines={1}
                  >
                    {fixture.homeTeam.shortCode}
                  </AppText>
                );
              })()}
              {(() => {
                const winner = getWinner(fixture);
                const isAwayWinner = winner === "away";
                const matchStarted = hasMatchStarted(
                  fixture.state,
                  fixture.result,
                  fixture.startTs
                );
                const isNotStarted = !matchStarted;
                return (
                  <AppText
                    variant="caption"
                    color={
                      isAwayWinner
                        ? "primary"
                        : isNotStarted
                          ? "primary"
                          : "secondary"
                    }
                    style={[
                      styles.teamAbbr,
                      isAwayWinner && styles.teamAbbrWinner,
                    ]}
                    numberOfLines={1}
                  >
                    {fixture.awayTeam.shortCode}
                  </AppText>
                );
              })()}
              {(() => {
                const winner = getWinner(fixture);
                const isAwayLoser = winner === "home";
                return (
                  <View
                    style={isAwayLoser ? styles.logoContainerDimmed : undefined}
                  >
                    <TeamLogo
                      imagePath={fixture.awayTeam.imagePath}
                      teamName={fixture.awayTeam.name}
                      size={20}
                    />
                  </View>
                );
              })()}
              {fixture.result ? (
                <AppText
                  variant="caption"
                  color="primary"
                  style={[
                    styles.resultText,
                    fixture.liveMinute != null && { color: theme.colors.primary, fontWeight: "800" },
                  ]}
                >
                  {fixture.result}
                </AppText>
              ) : (
                <AppText
                  variant="caption"
                  color="secondary"
                  style={styles.dateText}
                >
                  {formatDate(fixture.startTs)}
                </AppText>
              )}
            </View>
          </Pressable>
        ))}
      </View>
    );
  };

  // Render left column row (used by Animated.View, not FlatList)
  const renderLeftRowItem = (
    participant: (typeof participants)[0],
    index: number
  ) => {
    const isCurrentUser = participant.id === currentUserId;
    const position = showLivePoints ? index + 1 : participant.number;
    const change = positionChangeMap.get(participant.id) ?? 0;
    const movedUp = showLivePoints && change > 0;
    const movedDown = showLivePoints && change < 0;
    return (
      <View
        key={participant.id}
        style={[
          styles.leftColumnCell,
          {
            height: ROW_HEIGHT,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.colors.border,
            backgroundColor: isCurrentUser ? theme.colors.textPrimary + "06" : "transparent",
          },
        ]}
      >
        <AppText
          variant="body"
          style={[
            styles.participantNumber,
            isCurrentUser
              ? [styles.participantHighlight, { color: theme.colors.textPrimary }]
              : { color: theme.colors.textSecondary },
          ]}
        >
          {position}
        </AppText>
        <AppText
          variant="caption"
          numberOfLines={1}
          style={[
            styles.participantName,
            isCurrentUser
              ? [styles.participantHighlight, { color: theme.colors.textPrimary }]
              : { color: theme.colors.textSecondary },
          ]}
        >
          {participant.username || t("common.unknown")}
        </AppText>
        {movedUp ? (
          <Ionicons name="caret-up" size={10} color="#10B981" />
        ) : movedDown ? (
          <Ionicons name="caret-down" size={10} color={theme.colors.danger} />
        ) : showLivePoints ? (
          <View style={styles.changeArrowPlaceholder} />
        ) : null}
      </View>
    );
  };

  // Render participant row - ONLY match cells (left column is outside)
  const renderRow = ({
    item: participant,
    index,
  }: {
    item: (typeof participants)[0];
    index: number;
  }) => {
    const isCurrentUser = participant.id === currentUserId;
    return (
      <View
        style={[
          styles.predictionRow,
          {
            minWidth: totalWidth,
            height: ROW_HEIGHT,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.colors.border,
            backgroundColor: isCurrentUser ? theme.colors.textPrimary + "06" : "transparent",
          },
        ]}
      >
        {/* Total Points cell — first scrollable column */}
        <View
          style={[
            styles.predictionCell,
            {
              width: TOTAL_COLUMN_WIDTH,
              borderRightWidth: StyleSheet.hairlineWidth,
              borderRightColor: theme.colors.border,
              backgroundColor: showLivePoints ? theme.colors.primary + "08" : "transparent",
            },
          ]}
        >
          <AppText
            variant="body"
            style={{
              fontWeight: "700",
              fontSize: 13,
              color: showLivePoints
                ? theme.colors.primary
                : isCurrentUser ? theme.colors.textPrimary : theme.colors.textSecondary,
            }}
          >
            {showLivePoints
              ? participant.totalPoints + (liveBonusMap.get(participant.id) ?? 0)
              : participant.totalPoints}
          </AppText>
        </View>
        {/* Prediction cells */}
        {fixtures.map((fixture) => {
          const prediction = getPrediction(participant.id, fixture.id);
          const isLive = fixture.liveMinute != null;
          const matchFinished = fixture.result != null && !isLive;
          const rawPts = isLive
            ? calculateLivePoints(prediction, fixture.homeScore90, fixture.awayScore90)
            : getPoints(participant.id, fixture.id);
          // For finished matches with no prediction, show 0 points
          const pts = rawPts == null && matchFinished && !prediction ? "0" : rawPts;
          const predText = formatPrediction(
            prediction,
            participant.id,
            fixture.id
          );
          return (
            <View
              key={fixture.id}
              style={[
                styles.predictionCell,
                {
                  width: actualGameColumnWidth,
                  backgroundColor: fixture.liveMinute != null
                    ? theme.colors.primary + "06"
                    : fixture.result && fixture.liveMinute == null
                      ? getPointsCellBg(pts)
                      : undefined,
                },
              ]}
            >
              <View style={styles.predictionCellInner}>
                <AppText
                  variant="caption"
                  style={[
                    styles.predictionText,
                    { color: pts != null ? getPointsColor(pts) : theme.colors.textSecondary, fontWeight: "800" },
                    fixture.liveMinute != null && { color: theme.colors.primary, fontWeight: "800" },
                  ]}
                >
                  {predText}
                </AppText>
                {pts != null && (
                  <AppText
                    style={[
                      styles.pointsText,
                      { color: isLive ? theme.colors.primary : getPointsColor(pts), fontWeight: "700" },
                    ]}
                  >
                    {pts} pts
                  </AppText>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.contentRow}>
        {/* Left Column - Fixed, OUTSIDE horizontal scroll */}
        <View
          style={[
            styles.leftColumnFixed,
            {
              width: LEFT_COLUMN_WIDTH,
              borderRightWidth: StyleSheet.hairlineWidth,
              borderRightColor: theme.colors.border,
            },
          ]}
        >
          {/* Left Header */}
          <View
            style={[
              styles.leftHeader,
              {
                height: HEADER_HEIGHT,
                backgroundColor: theme.colors.background,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: theme.colors.border,
              },
            ]}
          >
          </View>

          {/* Left Column Rows - Animated, driven by right FlatList scroll */}
          <View style={styles.leftColumnList}>
            <Animated.View style={{ transform: [{ translateY }] }}>
              {sortedParticipants.map((p, i) => renderLeftRowItem(p, i))}
            </Animated.View>
          </View>
        </View>

        {/* Right Section - Horizontal Scroll Container (ONE for header + rows) */}
        <View style={styles.rightSection}>
          <ScrollView
            ref={horizontalScrollRef}
            horizontal
            showsHorizontalScrollIndicator={true}
            style={styles.horizontalScroll}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <View style={{ flex: 1, minWidth: totalWidth }}>
              {/* Header Row - Inside horizontal scroll */}
              {renderHeader()}

              {/* FlatList - ONE vertical list for all rows */}
              <Animated.FlatList
                ref={rightFlatListRef}
                data={sortedParticipants}
                renderItem={renderRow}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                  { useNativeDriver: true }
                )}
                style={styles.flatList}
                contentContainerStyle={{ paddingBottom: 40 }}
                nestedScrollEnabled={true}
                onScrollToIndexFailed={() => {}}
                getItemLayout={(_, index) => ({
                  length: ROW_HEIGHT,
                  offset: ROW_HEIGHT * index,
                  index,
                })}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    borderRadius: 12,
  },
  contentRow: {
    flex: 1,
    flexDirection: "row",
    width: "100%",
  },
  leftColumnFixed: {
    zIndex: 10,
  },
  leftHeader: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  leftColumnList: {
    flex: 1,
    overflow: "hidden",
  },
  leftColumnCell: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 0,
    paddingRight: 8,
    gap: 4,
  },
  changeArrowPlaceholder: {
    width: 10,
  },
  participantNumber: {
    fontWeight: "600",
    fontSize: 12,
    minWidth: 20,
    textAlign: "center",
  },
  participantName: {
    flex: 1,
  },
  rightSection: {
    flex: 1,
  },
  horizontalScroll: {
    flex: 1,
  },
  matchHeaderRow: {
    flexDirection: "row",
  },
  gameHeader: {
    height: HEADER_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  totalPointsHeader: {
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 6,
  },
  gameHeaderColumn: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  logoContainerDimmed: {
    opacity: 0.5,
  },
  teamAbbr: {
    fontSize: 10,
    textAlign: "center",
  },
  teamAbbrWinner: {
    fontWeight: "600",
  },
  resultText: {
    marginTop: 2,
    fontWeight: "800",
  },
  dateText: {
    marginTop: 2,
    fontWeight: "300",
  },
  flatList: {
    flex: 1,
  },
  predictionRow: {
    flexDirection: "row",
  },
  predictionCell: {
    height: ROW_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  predictionCellInner: {
    alignItems: "center",
  },
  predictionText: {
    fontSize: 12,
    fontWeight: "500",
  },
  pointsText: {
    fontSize: 9,
    fontWeight: "700",
  },
  totalPointsHeaderText: {
    fontWeight: "700",
  },
  participantHighlight: {
    fontWeight: "700",
  },
});
