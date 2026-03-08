// features/groups/group-lobby/components/LobbyRecentResults.tsx
// Compact recent results tiles — last 5 finished games with scores and points.

import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/lib/theme";
import type { FixtureItem } from "../types";

function getPointsColor(points: number | null | undefined, colors: { success: string; warning: string; danger: string }): string | null {
  if (points == null) return null;
  if (points >= 3) return colors.success;
  if (points >= 1) return colors.warning;
  return colors.danger;
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        {isLoading ? (
          <Animated.View
            style={[
              { width: 120, height: 14, borderRadius: 6, backgroundColor: theme.colors.border },
              skeletonStyle,
            ]}
          />
        ) : (
          <>
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
              {t("lobby.recentResults")}
            </Text>
            <Pressable onPress={() => onPress()} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
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
              const hasPoints = points != null;
              const color = hasPoints ? getPointsColor(points, { success: theme.colors.success, warning: theme.colors.warning, danger: theme.colors.danger })! : theme.colors.danger;

              return (
                <Pressable
                  key={fixture.id}
                  onPress={() => onPress(fixture.id)}
                  style={({ pressed }) => [
                    styles.tile,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  {/* Match result */}
                  <View style={styles.tileMatchSection}>
                    <View style={styles.tileTeamRow}>
                      <Text style={[styles.tileTeam, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {fixture.homeTeam?.shortCode ?? ""}
                      </Text>
                      <Text style={[styles.tileResultScore, { color: theme.colors.textPrimary }]}>
                        {fixture.homeScore90 ?? "?"}
                      </Text>
                    </View>
                    <View style={styles.tileTeamRow}>
                      <Text style={[styles.tileTeam, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {fixture.awayTeam?.shortCode ?? ""}
                      </Text>
                      <Text style={[styles.tileResultScore, { color: theme.colors.textPrimary }]}>
                        {fixture.awayScore90 ?? "?"}
                      </Text>
                    </View>
                  </View>

                  {/* Prediction + Points */}
                  <View style={[styles.tilePredictionSection, { backgroundColor: color + "15" }]}>
                    <Text style={[styles.tilePrediction, { color }]}>
                      {fixture.prediction ? `${fixture.prediction.home}-${fixture.prediction.away}` : "—"}
                    </Text>
                    <Text style={[styles.tilePoints, { color }]}>
                      {hasPoints ? `+${points}` : "+0"}
                    </Text>
                  </View>
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
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: "500",
  },
  viewAllCenter: {
    alignItems: "center",
    marginTop: 12,
  },
  viewAllBtn: {
    paddingVertical: 7,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  viewAllBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  tilesRow: {
    flexDirection: "row",
    gap: 8,
  },
  tile: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 6,
    overflow: "hidden",
  },
  tileMatchSection: {
    gap: 1,
    marginBottom: 10,
  },
  tileTeamRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tileTeam: {
    fontSize: 9,
    fontWeight: "700",
    flex: 1,
  },
  tileResultScore: {
    fontSize: 11,
    fontWeight: "700",
    minWidth: 14,
    textAlign: "center",
  },
  tilePredictionSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  tilePrediction: {
    fontSize: 12,
    fontWeight: "600",
  },
  tilePoints: {
    fontSize: 12,
    fontWeight: "700",
  },
});
