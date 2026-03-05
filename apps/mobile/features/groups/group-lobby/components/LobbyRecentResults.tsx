// features/groups/group-lobby/components/LobbyRecentResults.tsx
// Compact recent results tiles — last 5 finished games with scores and points.

import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/lib/theme";
import type { FixtureItem } from "../types";

const POINTS_COLORS = {
  green: "#22C55E",
  orange: "#F59E0B",
  red: "#EF4444",
} as const;

function getPointsColor(points: number | null | undefined): string | null {
  if (points == null) return null;
  if (points >= 3) return POINTS_COLORS.green;
  if (points >= 1) return POINTS_COLORS.orange;
  return POINTS_COLORS.red;
}

export interface LobbyRecentResultsProps {
  fixtures: FixtureItem[];
  onPress: (fixtureId?: number) => void;
  isLoading: boolean;
}

function LobbyRecentResultsInner({
  fixtures,
  onPress,
  isLoading,
}: LobbyRecentResultsProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  const skeletonOpacity = useSharedValue(0.3);

  useEffect(() => {
    if (isLoading) {
      skeletonOpacity.value = withRepeat(
        withTiming(1, { duration: 800 }),
        -1,
        true
      );
    }
  }, [isLoading, skeletonOpacity]);

  const skeletonStyle = useAnimatedStyle(() => ({
    opacity: skeletonOpacity.value,
  }));

  // Take last 5
  const tiles = fixtures.slice(0, 5);

  // Don't render if no finished games and not loading
  if (!isLoading && tiles.length === 0) return null;

  const tileBg = theme.colors.textPrimary + "10";

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        {isLoading ? (
          <>
            <Animated.View
              style={[
                { width: 120, height: 14, borderRadius: 6, backgroundColor: theme.colors.border },
                skeletonStyle,
              ]}
            />
            <Animated.View
              style={[
                { width: 60, height: 12, borderRadius: 6, backgroundColor: theme.colors.border },
                skeletonStyle,
              ]}
            />
          </>
        ) : (
          <>
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
              {t("lobby.recentResults")}
            </Text>
            <Pressable
              onPress={() => onPress()}
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            >
              <Text
                style={[
                  styles.headerViewAll,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t("lobby.viewResults")}
              </Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Tiles */}
      <View style={styles.tilesRow}>
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.tile,
                  { backgroundColor: theme.colors.border },
                  skeletonStyle,
                ]}
              />
            ))
          : tiles.map((fixture) => {
              const points = fixture.prediction?.points ?? null;
              const pointsColor = getPointsColor(points);
              const hasPoints = points != null;

              return (
                <Pressable
                  key={fixture.id}
                  onPress={() => onPress(fixture.id)}
                  style={({ pressed }) => [
                    styles.tile,
                    { backgroundColor: tileBg },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  {/* Prediction + Points */}
                  <View style={styles.tileTopRow}>
                    <Text
                      style={[
                        styles.tilePrediction,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {fixture.prediction ? `${fixture.prediction.home}-${fixture.prediction.away}` : "—"}
                    </Text>
                    <Text
                      style={[
                        styles.tilePoints,
                        {
                          color: hasPoints
                            ? pointsColor!
                            : theme.colors.textSecondary,
                        },
                      ]}
                    >
                      {hasPoints ? `+${points}` : "—"}
                    </Text>
                  </View>

                  {/* Teams + Score */}
                  <Text
                    style={[
                      styles.tileTeam,
                      { color: theme.colors.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {fixture.homeTeam?.shortCode ?? "???"}
                  </Text>
                  <Text
                    style={[
                      styles.tileScore,
                      { color: theme.colors.textPrimary },
                    ]}
                  >
                    {fixture.homeScore90 ?? "?"}-{fixture.awayScore90 ?? "?"}
                  </Text>
                  <Text
                    style={[
                      styles.tileTeam,
                      { color: theme.colors.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {fixture.awayTeam?.shortCode ?? "???"}
                  </Text>
                </Pressable>
              );
            })}
      </View>
    </View>
  );
}

export const LobbyRecentResults = React.memo(LobbyRecentResultsInner);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  headerViewAll: {
    fontSize: 12,
    fontWeight: "700",
  },
  tilesRow: {
    flexDirection: "row",
    gap: 8,
  },
  tile: {
    flex: 1,
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 8,
    minHeight: 72,
    overflow: "hidden",
  },
  tileTeam: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 2,
  },
  tileScore: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  tileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 6,
    marginBottom: 4,
  },
  tilePrediction: {
    fontSize: 10,
    fontWeight: "600",
  },
  tilePoints: {
    fontSize: 10,
    fontWeight: "700",
  },
});
