import React, { useMemo } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { hasMatchStarted } from "@repo/utils";
import { AppText } from "@/components/ui";
import { useTheme, spacing, radius } from "@/lib/theme";
import { getShadowStyle } from "@/lib/theme/shadows";
import { useAuth } from "@/lib/auth/useAuth";
import { usePredictionsOverviewQuery } from "@/domains/groups";
import type { ApiPredictionsOverviewParticipant } from "@repo/types";

type Props = {
  groupId: number | null;
  fixtureId: number;
};

export function FixturePredictionsList({ groupId, fixtureId }: Props) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { data, isLoading } = usePredictionsOverviewQuery(groupId);

  const currentUserId = user?.id ?? null;

  const { participants, predictions, predictionPoints, fixtures, scoringConfig } =
    data?.data ?? {
      participants: [],
      predictions: {},
      predictionPoints: {},
      fixtures: [],
      scoringConfig: { onTheNosePoints: 3, correctDifferencePoints: 2, outcomePoints: 1 },
    };

  const fixture = fixtures.find((f) => f.id === fixtureId);

  const sortedParticipants = useMemo(() => {
    if (!participants.length) return [];
    return [...participants].sort((a, b) => {
      const ptsA = parseInt(
        predictionPoints[`${a.id}_${fixtureId}`] ?? "0",
        10
      );
      const ptsB = parseInt(
        predictionPoints[`${b.id}_${fixtureId}`] ?? "0",
        10
      );
      if (ptsB !== ptsA) return ptsB - ptsA;
      return a.number - b.number;
    });
  }, [participants, predictionPoints, fixtureId]);

  const getPrediction = (userId: number): string | null => {
    return predictions[`${userId}_${fixtureId}`] ?? null;
  };

  const getPoints = (userId: number): string | null => {
    return predictionPoints[`${userId}_${fixtureId}`] ?? null;
  };

  const maxPts = scoringConfig?.onTheNosePoints ?? 3;
  const getPointsColor = (points: string | null): string => {
    if (!points) return theme.colors.textSecondary;
    const n = parseInt(points, 10);
    if (n >= maxPts) return theme.colors.success;
    if (n >= 1) return theme.colors.warning;
    return theme.colors.textSecondary;
  };

  const formatPrediction = (
    prediction: string | null,
    userId: number
  ): string => {
    if (userId === currentUserId) {
      return prediction || "-:-";
    }
    if (!fixture) return "-:-";
    const hasStarted = hasMatchStarted(
      fixture.state,
      fixture.startTs,
      fixture.result
    );
    if (!hasStarted) return "?";
    return prediction || "-:-";
  };

  if (groupId == null) return null;
  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }
  if (sortedParticipants.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
      {sortedParticipants.map(
        (participant: ApiPredictionsOverviewParticipant, index: number) => {
          const isCurrentUser = participant.id === currentUserId;
          const prediction = getPrediction(participant.id);
          const pts = getPoints(participant.id);
          const predText = formatPrediction(prediction, participant.id);
          const rank = index + 1;

          return (
            <View
              key={participant.id}
              style={[
                styles.row,
                {
                  backgroundColor: isCurrentUser
                    ? theme.colors.primary + "14"
                    : theme.colors.cardBackground,
                },
              ]}
            >
              <View
                style={[
                  styles.rankBadge,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <AppText variant="caption" style={styles.rankText}>
                  {rank}
                </AppText>
              </View>
              <AppText
                variant="body"
                numberOfLines={1}
                style={[
                  styles.username,
                  isCurrentUser && {
                    fontWeight: "700",
                    color: theme.colors.primary,
                  },
                ]}
              >
                {participant.username ?? `Player #${participant.number}`}
              </AppText>
              <AppText
                variant="caption"
                color="secondary"
                style={styles.prediction}
              >
                {predText}
              </AppText>
              <AppText
                variant="caption"
                style={[styles.points, { color: getPointsColor(pts) }]}
              >
                {pts ?? "0"}
              </AppText>
            </View>
          );
        }
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
  },
  loadingContainer: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: radius.sm,
    paddingHorizontal: radius.md,
    marginBottom: radius.xs,
    borderRadius: radius.lg,
    gap: spacing.ms,
    ...getShadowStyle("sm"),
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: radius.s,
    alignItems: "center",
    justifyContent: "center",
    ...getShadowStyle("sm"),
  },
  rankText: {
    fontWeight: "700",
    fontSize: 12,
  },
  username: {
    flex: 1,
  },
  prediction: {
    fontSize: 14,
    minWidth: 36,
  },
  points: {
    fontWeight: "700",
    fontSize: 14,
    minWidth: 20,
    textAlign: "right",
  },
});
