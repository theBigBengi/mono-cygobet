// features/groups/group-lobby/components/LobbyRecentResults.tsx
// Mini score cards — compact horizontal cards with colored top edge.

import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable, Text, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/lib/theme";
import type { FixtureItem } from "../types";

function getPointsColor(points: number | null | undefined, colors: { success: string; warning: string; danger: string }, maxPossiblePoints = 3): string {
  if (points == null) return colors.danger;
  if (maxPossiblePoints > 0 && points >= maxPossiblePoints) return colors.success;
  if (points >= 1) return colors.warning;
  return colors.danger;
}

export interface LobbyRecentResultsProps {
  fixtures: FixtureItem[];
  onPress: (fixtureId?: number) => void;
  isLoading: boolean;
  completedFixturesCount: number;
  maxPossiblePoints?: number;
}

function LobbyRecentResultsInner({
  fixtures,
  onPress,
  isLoading,
  completedFixturesCount,
  maxPossiblePoints = 3,
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

  const tiles = fixtures.slice(0, 5);

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

      {/* Cards */}
      {isLoading ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsRow}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.card,
                { backgroundColor: theme.colors.border },
                skeletonStyle,
              ]}
            />
          ))}
        </ScrollView>
      ) : tiles.length === 0 ? (
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          {t("lobby.noRecentResults")}
        </Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsRow}>
          {tiles.map((fixture, index) => {
            const points = fixture.prediction?.points ?? null;
            const color = getPointsColor(points, {
              success: theme.colors.success,
              warning: theme.colors.warning,
              danger: theme.colors.danger,
            }, maxPossiblePoints);

            return (
              <Pressable
                key={fixture.id}
                onPress={() => onPress(fixture.id)}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: theme.colors.surface },
                  pressed && { opacity: 0.7 },
                ]}
              >
                {/* Colored top edge */}
                <View style={[styles.topEdge, { backgroundColor: color }]} />

                {/* Score centered */}
                <View style={styles.scoreSection}>
                  <Text style={[styles.teamCode, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    {fixture.homeTeam?.shortCode ?? ""}
                  </Text>
                  <Text style={[styles.score, { color: theme.colors.textPrimary }]}>
                    {fixture.homeScore90 ?? "?"} - {fixture.awayScore90 ?? "?"}
                  </Text>
                  <Text style={[styles.teamCode, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    {fixture.awayTeam?.shortCode ?? ""}
                  </Text>
                </View>

                {/* Bottom: prediction + points */}
                <View style={[styles.bottomSection, { borderTopColor: theme.colors.border }]}>
                  <Text style={[styles.predictionText, { color: theme.colors.textSecondary }]}>
                    {fixture.prediction ? `${fixture.prediction.home}-${fixture.prediction.away}` : "—"}
                  </Text>
                  <View style={[styles.pointsPill, { backgroundColor: color + "18" }]}>
                    <Text style={[styles.pointsText, { color }]}>
                      +{points ?? 0}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

export const LobbyRecentResults = React.memo(LobbyRecentResultsInner);

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 13,
    fontWeight: "500",
    paddingHorizontal: 16,
  },
  cardsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
  },
  card: {
    width: 100,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  topEdge: {
    height: 4,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  scoreSection: {
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 2,
  },
  teamCode: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  score: {
    fontSize: 18,
    fontWeight: "800",
    marginVertical: 2,
  },
  bottomSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  predictionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  pointsPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pointsText: {
    fontSize: 11,
    fontWeight: "800",
  },
});
