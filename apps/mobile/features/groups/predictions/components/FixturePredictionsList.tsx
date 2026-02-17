import React, { useMemo } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { isNotStarted } from "@repo/utils";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth/useAuth";
import { usePredictionsOverviewQuery } from "@/domains/groups";
import type { ApiPredictionsOverviewParticipant } from "@repo/types";

type Props = {
  groupId: number | null;
  fixtureId: number;
};

function hasMatchStarted(
  state: string,
  result: string | null,
  startTs: number
): boolean {
  if (result) return true;
  const now = Math.floor(Date.now() / 1000);
  if (startTs > now) return false;
  return !isNotStarted(state);
}

export function FixturePredictionsList({ groupId, fixtureId }: Props) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { data, isLoading } = usePredictionsOverviewQuery(groupId);

  const currentUserId = user?.id ?? null;

  const { participants, predictions, predictionPoints, fixtures } =
    data?.data ?? {
      participants: [],
      predictions: {},
      predictionPoints: {},
      fixtures: [],
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
    userId: number
  ): string => {
    if (userId === currentUserId) {
      return prediction || "-:-";
    }
    if (!fixture) return "-:-";
    const hasStarted = hasMatchStarted(
      fixture.state,
      fixture.result,
      fixture.startTs
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
    <View style={[styles.container, { borderTopColor: theme.colors.border }]}>
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
                    : theme.colors.surface,
                  borderColor: isCurrentUser
                    ? theme.colors.primary + "40"
                    : theme.colors.border,
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
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
