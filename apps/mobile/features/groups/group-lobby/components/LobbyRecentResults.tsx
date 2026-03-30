// features/groups/group-lobby/components/LobbyRecentResults.tsx
// Mini score cards — compact horizontal cards with colored top edge.

import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable, Text, ScrollView } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTheme, spacing, radius } from "@/lib/theme";
import { getShadowStyle } from "@/lib/theme/shadows";
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
              { width: 120, height: 14, borderRadius: radius.xs, backgroundColor: theme.colors.border },
              skeletonStyle,
            ]}
          />
        ) : (
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            {t("lobby.recentResults")}
          </Text>
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
          {tiles.map((fixture) => {
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
                  { borderColor: theme.colors.border },
                  pressed && { opacity: 0.7 },
                ]}
              >
                {/* Teams */}
                <Text style={[styles.teams, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {fixture.homeTeam?.shortCode ?? ""} v {fixture.awayTeam?.shortCode ?? ""}
                </Text>

                {/* Score */}
                <Text style={[styles.score, { color: theme.colors.textPrimary }]}>
                  {fixture.homeScore90 ?? "?"} - {fixture.awayScore90 ?? "?"}
                </Text>

                {/* Prediction */}
                <View style={[styles.predRow, { borderTopColor: theme.colors.border }]}>
                  <Text style={[styles.predLabel, { color: theme.colors.textSecondary }]}>
                    {fixture.prediction ? `${fixture.prediction.home}-${fixture.prediction.away}` : "—"}
                  </Text>
                  <Text style={[styles.pointsText, { color }]}>
                    +{points ?? 0}
                  </Text>
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
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  cardWrapper: {
    borderRadius: radius.sm,
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "500",
  },
  cardsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  card: {
    width: 110,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderBottomWidth: 3,
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  teams: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textAlign: "center",
    paddingTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  score: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    paddingVertical: spacing.ms,
  },
  predRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.sm,
  },
  predLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  pointsText: {
    fontSize: 13,
    fontWeight: "800",
  },
});
