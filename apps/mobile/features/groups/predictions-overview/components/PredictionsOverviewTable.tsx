import React, { useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  Dimensions,
  Pressable,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { useRouter } from "expo-router";
import { isNotStarted } from "@repo/utils";
import * as Haptics from "expo-haptics";
import { AppText } from "@/components/ui";
import { useTheme, CARD_BORDER_BOTTOM_WIDTH } from "@/lib/theme";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { useAuth } from "@/lib/auth/useAuth";
import type { ApiPredictionsOverviewData } from "@repo/types";

const SCREEN_WIDTH = Dimensions.get("window").width;

interface PredictionsOverviewTableProps {
  data: ApiPredictionsOverviewData;
  groupId: number | null;
}

const LEFT_COLUMN_WIDTH = 120;
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
  const leftFlatListRef = useRef<FlatList>(null);
  const rightFlatListRef = useRef<FlatList>(null);
  const horizontalScrollRef = useRef<ScrollView>(null);
  const isScrolling = useRef<"left" | "right" | null>(null);

  const onLeftScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (isScrolling.current === "right") return;
      isScrolling.current = "left";
      rightFlatListRef.current?.scrollToOffset({
        offset: e.nativeEvent.contentOffset.y,
        animated: false,
      });
      isScrolling.current = null;
    },
    []
  );

  const onRightScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (isScrolling.current === "left") return;
      isScrolling.current = "right";
      leftFlatListRef.current?.scrollToOffset({
        offset: e.nativeEvent.contentOffset.y,
        animated: false,
      });
      isScrolling.current = null;
    },
    []
  );

  const { participants, fixtures, predictions, predictionPoints } = data;
  const currentUserId = user?.id ?? null;

  const getPrediction = (userId: number, fixtureId: number): string | null => {
    return predictions[`${userId}_${fixtureId}`] ?? null;
  };

  const getPoints = (userId: number, fixtureId: number): string | null => {
    return predictionPoints[`${userId}_${fixtureId}`] ?? null;
  };

  const calculateLivePoints = (
    prediction: string | null,
    homeScore: number | null,
    awayScore: number | null
  ): string | null => {
    if (!prediction || homeScore == null || awayScore == null) return null;
    const parts = prediction.split(/[-:]/);
    if (parts.length !== 2) return null;
    const predHome = parseInt(parts[0], 10);
    const predAway = parseInt(parts[1], 10);
    if (isNaN(predHome) || isNaN(predAway)) return null;

    // Exact score
    if (predHome === homeScore && predAway === awayScore) return "3";
    // Correct goal difference
    if (predHome - predAway === homeScore - awayScore) return "2";
    // Correct outcome
    const predOutcome = Math.sign(predHome - predAway);
    const actualOutcome = Math.sign(homeScore - awayScore);
    if (predOutcome === actualOutcome) return "1";
    return "0";
  };

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
    if (n >= 3) return "#10B98112";
    if (n >= 2) return "#F59E0B10";
    if (n >= 1) return "#E8A30810";
    return theme.colors.danger + "10";
  };

  const formatPrediction = (
    prediction: string | null,
    userId: number,
    fixtureId: number
  ): string => {
    // If it's the current user, always show their prediction (or "-:-" if none)
    if (userId === currentUserId) {
      return prediction || "-:-";
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
    return prediction || "-:-";
  };

  const getTeamAbbr = (teamName: string): string => {
    const words = teamName.split(" ");
    if (words.length > 1) {
      return words
        .slice(0, 2)
        .map((w) => w.charAt(0).toUpperCase())
        .join("");
    }
    return teamName.substring(0, 3).toUpperCase();
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return `${day}/${month}`;
  };

  // Check which team won: prefer numeric scores, fallback to parsing result string
  const getWinner = (fixture: {
    result: string | null;
    homeScore90?: number | null;
    awayScore90?: number | null;
  }): "home" | "away" | "draw" | null => {
    if (fixture.homeScore90 != null && fixture.awayScore90 != null) {
      if (fixture.homeScore90 > fixture.awayScore90) return "home";
      if (fixture.awayScore90 > fixture.homeScore90) return "away";
      return "draw";
    }
    const result = fixture.result;
    if (!result) return null;
    const [home, away] = result.split("-").map(Number);
    if (isNaN(home) || isNaN(away)) return null;
    if (home > away) return "home";
    if (away > home) return "away";
    return "draw";
  };

  const hasMatchStarted = (
    state: string,
    result: string | null,
    startTs: number
  ): boolean => {
    if (result) return true;
    const now = Math.floor(Date.now() / 1000);
    if (startTs > now) return false;
    return !isNotStarted(state);
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
            backgroundColor: theme.colors.surface,
            borderBottomWidth: CARD_BORDER_BOTTOM_WIDTH,
            borderBottomColor: theme.colors.textSecondary + "40",
          },
        ]}
      >
        {/* Total Points header — first scrollable column */}
        <View
          style={[
            styles.gameHeader,
            styles.totalPointsHeader,
            {
              width: TOTAL_COLUMN_WIDTH,
              borderRightWidth: 1,
              borderRightColor: theme.colors.border,
              backgroundColor: theme.colors.textSecondary + "10",
            },
          ]}
        >
          <AppText variant="caption" style={[styles.totalPointsHeaderText, { color: theme.colors.textSecondary }]}>
            Pts
          </AppText>
        </View>
        {/* Fixture columns */}
        {fixtures.map((fixture) => (
          <Pressable
            key={fixture.id}
            style={({ pressed }) => [
              styles.gameHeader,
              {
                width: actualGameColumnWidth,
                borderRightWidth: 1,
                borderRightColor: theme.colors.border,
                backgroundColor: pressed
                  ? theme.colors.primary + "10"
                  : fixture.liveMinute != null
                    ? theme.colors.primary + "0A"
                    : "transparent",
                transform: [{ scale: pressed ? 0.98 : 1 }],
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
                    {fixture.homeTeam.shortCode || getTeamAbbr(fixture.homeTeam.name)}
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
                    {fixture.awayTeam.shortCode || getTeamAbbr(fixture.awayTeam.name)}
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
                    fixture.liveMinute != null && { color: theme.colors.primary, fontWeight: "700" },
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

  // Render left column row
  const renderLeftRow = ({
    item: participant,
    index,
  }: {
    item: (typeof participants)[0];
    index: number;
  }) => {
    const isCurrentUser = participant.id === currentUserId;
    const rowBg = index % 2 === 0
      ? theme.colors.background
      : theme.colors.surface;
    return (
      <View
        style={[
          styles.leftColumnCell,
          {
            height: ROW_HEIGHT,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
            backgroundColor: rowBg,
          },
        ]}
      >
        {isCurrentUser && (
          <View
            style={[styles.currentUserOverlay, { borderColor: theme.colors.primary }]}
            pointerEvents="none"
          />
        )}
        <AppText
          variant="body"
          style={[
            styles.participantNumber,
            isCurrentUser && [styles.participantHighlight, { color: theme.colors.primary }],
          ]}
        >
          {participant.number}
        </AppText>
        <AppText
          variant="caption"
          numberOfLines={1}
          style={[
            styles.participantName,
            isCurrentUser
              ? [styles.participantHighlight, { color: theme.colors.primary }]
              : { color: theme.colors.textSecondary },
          ]}
        >
          {participant.username || t("common.unknown")}
        </AppText>
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
    const rowBg = index % 2 === 0
      ? theme.colors.background
      : theme.colors.surface;
    return (
      <View
        style={[
          styles.predictionRow,
          {
            minWidth: totalWidth,
            height: ROW_HEIGHT,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
            backgroundColor: rowBg,
          },
        ]}
      >
        {isCurrentUser && (
          <View
            style={[styles.currentUserOverlay, { borderColor: theme.colors.primary }]}
            pointerEvents="none"
          />
        )}
        {/* Total Points cell — first scrollable column */}
        <View
          style={[
            styles.predictionCell,
            {
              width: TOTAL_COLUMN_WIDTH,
              borderRightWidth: 1,
              borderRightColor: theme.colors.border,
              backgroundColor: theme.colors.textSecondary + "10",
            },
          ]}
        >
          <AppText
            variant="caption"
            style={{
              fontWeight: "700",
              color: isCurrentUser ? theme.colors.primary : theme.colors.textSecondary,
            }}
          >
            {participant.totalPoints}
          </AppText>
        </View>
        {/* Prediction cells */}
        {fixtures.map((fixture) => {
          const prediction = getPrediction(participant.id, fixture.id);
          const isLive = fixture.liveMinute != null;
          const pts = isLive
            ? calculateLivePoints(prediction, fixture.homeScore90, fixture.awayScore90)
            : getPoints(participant.id, fixture.id);
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
                  borderRightWidth: 1,
                  borderRightColor: theme.colors.border,
                  backgroundColor: fixture.liveMinute != null
                    ? theme.colors.primary + "0A"
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
                    { color: pts != null ? getPointsColor(pts) : theme.colors.textSecondary, fontWeight: "600" },
                    fixture.liveMinute != null && { color: theme.colors.primary, fontWeight: "600" },
                  ]}
                >
                  {predText}
                </AppText>
                {pts !== null && (
                  <AppText
                    style={[
                      styles.pointsText,
                      { color: isLive ? theme.colors.primary : getPointsColor(pts), fontWeight: isLive ? "800" : "700" },
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
              borderRightWidth: 1,
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
                backgroundColor: theme.colors.surface,
                borderBottomWidth: CARD_BORDER_BOTTOM_WIDTH,
                borderBottomColor: theme.colors.textSecondary + "40",
              },
            ]}
          >
          </View>

          {/* Left Column Rows - Fixed, OUTSIDE horizontal scroll */}
          <FlatList
            ref={leftFlatListRef}
            data={participants}
            renderItem={renderLeftRow}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={onLeftScroll}
            style={styles.leftColumnList}
            onScrollToIndexFailed={() => {}}
            getItemLayout={(_, index) => ({
              length: ROW_HEIGHT,
              offset: ROW_HEIGHT * index,
              index,
            })}
          />
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
              <FlatList
                ref={rightFlatListRef}
                data={participants}
                renderItem={renderRow}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={onRightScroll}
                style={styles.flatList}
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
  headerText: {
    fontWeight: "600",
  },
  leftColumnList: {
    flex: 1,
  },
  leftColumnCell: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    gap: 4,
  },
  participantNumber: {
    fontWeight: "600",
    minWidth: 24,
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
    justifyContent: "center",
    alignItems: "center",
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
    fontWeight: "600",
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
  currentUserOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    zIndex: 10,
  },
});
