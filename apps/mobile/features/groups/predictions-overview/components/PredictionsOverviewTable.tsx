import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, ScrollView, FlatList } from "react-native";
import { isNotStarted } from "@repo/utils";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { useAuth } from "@/lib/auth/useAuth";
import type { ApiPredictionsOverviewData } from "@repo/types";

interface PredictionsOverviewTableProps {
  data: ApiPredictionsOverviewData;
}

const LEFT_COLUMN_WIDTH = 120;
const TOTAL_COLUMN_WIDTH = 50;
const GAME_COLUMN_WIDTH = 50;
const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 110;

export function PredictionsOverviewTable({ data }: PredictionsOverviewTableProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const { user } = useAuth();
  const leftFlatListRef = useRef<FlatList>(null);
  const rightFlatListRef = useRef<FlatList>(null);
  const horizontalScrollRef = useRef<ScrollView>(null);

  const { participants, fixtures, predictions, predictionPoints } = data;
  const currentUserId = user?.id ?? null;

  const getPrediction = (userId: number, fixtureId: number): string | null => {
    return predictions[`${userId}_${fixtureId}`] ?? null;
  };

  const getPoints = (userId: number, fixtureId: number): string | null => {
    return predictionPoints[`${userId}_${fixtureId}`] ?? null;
  };

  const getPointsColor = (points: string | null): string => {
    if (!points) return theme.colors.textSecondary;
    const n = parseInt(points, 10);
    if (n >= 3) return "#34C759";
    if (n >= 2) return "#FF9500";
    if (n >= 1) return theme.colors.primary;
    return theme.colors.textSecondary;
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

    const hasStarted = hasMatchStarted(fixture.state, fixture.result, fixture.startTs);

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

  // Check which team won based on result (e.g., "2:1" -> home wins, "1:2" -> away wins, "1:1" -> draw)
  const getWinner = (result: string | null): "home" | "away" | "draw" | null => {
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

  const totalWidth = TOTAL_COLUMN_WIDTH + fixtures.length * GAME_COLUMN_WIDTH;

  // Render header row - inside horizontal scroll
  const renderHeader = () => {
    return (
      <View
        style={[
          styles.matchHeaderRow,
          {
            width: totalWidth,
            height: HEADER_HEIGHT,
            backgroundColor: theme.colors.surface,
            borderBottomWidth: 2,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        {/* Total Points header — first scrollable column */}
        <View
          style={[
            styles.gameHeader,
            {
              width: TOTAL_COLUMN_WIDTH,
              borderRightWidth: 1,
              borderRightColor: theme.colors.border,
            },
          ]}
        >
          <AppText variant="caption" style={{ fontWeight: "600" }}>
            Pts
          </AppText>
        </View>
        {/* Fixture columns */}
        {fixtures.map((fixture) => (
          <View
            key={fixture.id}
            style={[
              styles.gameHeader,
              {
                width: GAME_COLUMN_WIDTH,
                borderRightWidth: 1,
                borderRightColor: theme.colors.border,
              },
            ]}
          >
            {/* Column layout: Home Logo, Home Abbr, Away Abbr, Away Logo, Result */}
            <View style={styles.gameHeaderColumn}>
              {(() => {
                const winner = getWinner(fixture.result);
                const isHomeLoser = winner === "away";
                return (
                  <View style={isHomeLoser ? styles.logoContainerDimmed : undefined}>
                    <TeamLogo
                      imagePath={fixture.homeTeam.imagePath}
                      teamName={fixture.homeTeam.name}
                      size={20}
                    />
                  </View>
                );
              })()}
              {(() => {
                const winner = getWinner(fixture.result);
                const isHomeWinner = winner === "home";
                const matchStarted = hasMatchStarted(fixture.state, fixture.result, fixture.startTs);
                const isNotStarted = !matchStarted;
                return (
                  <AppText
                    variant="caption"
                    color={isHomeWinner ? "primary" : isNotStarted ? "primary" : "secondary"}
                    style={[
                      styles.teamAbbr,
                      isHomeWinner && styles.teamAbbrWinner,
                    ]}
                    numberOfLines={1}
                  >
                    {getTeamAbbr(fixture.homeTeam.name)}
                  </AppText>
                );
              })()}
              {(() => {
                const winner = getWinner(fixture.result);
                const isAwayWinner = winner === "away";
                const matchStarted = hasMatchStarted(fixture.state, fixture.result, fixture.startTs);
                const isNotStarted = !matchStarted;
                return (
                  <AppText
                    variant="caption"
                    color={isAwayWinner ? "primary" : isNotStarted ? "primary" : "secondary"}
                    style={[
                      styles.teamAbbr,
                      isAwayWinner && styles.teamAbbrWinner,
                    ]}
                    numberOfLines={1}
                  >
                    {getTeamAbbr(fixture.awayTeam.name)}
                  </AppText>
                );
              })()}
              {(() => {
                const winner = getWinner(fixture.result);
                const isAwayLoser = winner === "home";
                return (
                  <View style={isAwayLoser ? styles.logoContainerDimmed : undefined}>
                    <TeamLogo
                      imagePath={fixture.awayTeam.imagePath}
                      teamName={fixture.awayTeam.name}
                      size={20}
                    />
                  </View>
                );
              })()}
              {fixture.result ? (
                <AppText variant="caption" color="primary" style={styles.resultText}>
                  {fixture.result}
                </AppText>
              ) : (
                <AppText variant="caption" color="secondary" style={styles.dateText}>
                  {formatDate(fixture.startTs)}
                </AppText>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  // Render left column row
  const renderLeftRow = ({ item: participant }: { item: typeof participants[0] }) => {
    const isCurrentUser = participant.id === currentUserId;
    return (
      <View
        style={[
          styles.leftColumnCell,
          {
            height: ROW_HEIGHT,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
            backgroundColor: isCurrentUser
              ? theme.colors.primary + "14"
              : theme.colors.surface,
          },
        ]}
      >
        <AppText variant="body" style={styles.participantNumber}>
          {participant.number}
        </AppText>
        <AppText
          variant="caption"
          numberOfLines={1}
          style={[
            styles.participantName,
            isCurrentUser && { fontWeight: "700", color: theme.colors.primary },
          ]}
        >
          {participant.username || t("common.unknown")}
        </AppText>
      </View>
    );
  };

  // Render participant row - ONLY match cells (left column is outside)
  const renderRow = ({ item: participant }: { item: typeof participants[0] }) => {
    const isCurrentUser = participant.id === currentUserId;
    return (
      <View
        style={[
          styles.predictionRow,
          {
            width: totalWidth,
            height: ROW_HEIGHT,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
            backgroundColor: isCurrentUser
              ? theme.colors.primary + "14"
              : theme.colors.background,
          },
        ]}
      >
        {/* Total Points cell — first scrollable column */}
        <View
          style={[
            styles.predictionCell,
            {
              width: TOTAL_COLUMN_WIDTH,
              borderRightWidth: 1,
              borderRightColor: theme.colors.border,
            },
          ]}
        >
          <AppText variant="caption" style={{ fontWeight: "700" }}>
            {participant.totalPoints}
          </AppText>
        </View>
        {/* Prediction cells */}
        {fixtures.map((fixture) => {
          const prediction = getPrediction(participant.id, fixture.id);
          const pts = getPoints(participant.id, fixture.id);
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
                  width: GAME_COLUMN_WIDTH,
                  borderRightWidth: 1,
                  borderRightColor: theme.colors.border,
                },
              ]}
            >
              <View style={{ alignItems: "center" }}>
                <AppText
                  variant="caption"
                  color="secondary"
                  style={{ fontSize: 11 }}
                >
                  {predText}
                </AppText>
                {pts !== null && (
                  <AppText
                    style={{
                      fontSize: 9,
                      fontWeight: "700",
                      color: getPointsColor(pts),
                    }}
                  >
                    {pts}
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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
                borderBottomWidth: 2,
                borderBottomColor: theme.colors.border,
              },
            ]}
          >
            <AppText variant="body" style={styles.headerText}>#</AppText>
          </View>

          {/* Left Column Rows - Fixed, OUTSIDE horizontal scroll */}
          <FlatList
            ref={leftFlatListRef}
            data={participants}
            renderItem={renderLeftRow}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
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
            contentContainerStyle={{ width: totalWidth }}
          >
            <View style={{ width: totalWidth }}>
              {/* Header Row - Inside horizontal scroll */}
              {renderHeader()}

              {/* FlatList - ONE vertical list for all rows */}
              <FlatList
                ref={rightFlatListRef}
                data={participants}
                renderItem={renderRow}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={true}
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
  },
  contentRow: {
    flex: 1,
    flexDirection: "row",
    width: "100%",
  },
  leftColumnFixed: {
    // Fixed width column
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
    gap: 8,
  },
  participantNumber: {
    fontWeight: "600",
    minWidth: 24,
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
  gameHeaderColumn: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
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
});
