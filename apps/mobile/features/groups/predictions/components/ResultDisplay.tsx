import React from "react";
import { View, StyleSheet } from "react-native";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { GameResultOrTime } from "../utils/fixture-helpers";

type ResultDisplayProps = {
  result: GameResultOrTime;
  isLive: boolean;
  isFinished: boolean;
  isCancelled: boolean;
  isHomeWinner: boolean;
  isAwayWinner: boolean;
  /** When provided, shows only the score for this team type */
  type?: "home" | "away";
};

/**
 * Displays game result scores, or status text for cancelled games
 */
function ResultDisplayInner({
  result,
  isLive,
  isFinished,
  isCancelled,
  isHomeWinner,
  isAwayWinner,
  type,
}: ResultDisplayProps) {
  const { theme } = useTheme();
  if (!result || (!isLive && !isFinished && !isCancelled)) {
    return null;
  }

  // Cancelled games: show status text (e.g. "Postponed", "Cancelled")
  if (isCancelled) {
    // For single type, show dash
    if (type) {
      return (
        <View style={styles.timeResultBadge}>
          <AppText variant="caption" color="secondary" style={styles.resultText}>
            -
          </AppText>
        </View>
      );
    }
    return (
      <View style={styles.timeResultContainer}>
        <AppText
          variant="caption"
          color="secondary"
          style={styles.cancelledText}
        >
          {result.home || "-"}
        </AppText>
      </View>
    );
  }

  // When finished: winner score in primary (team emphasis), loser in secondary
  const homeScoreColor = isLive
    ? result.home
      ? undefined
      : "secondary"
    : isFinished
      ? isHomeWinner
        ? "primary"
        : "secondary"
      : "secondary";
  const awayScoreColor = isLive
    ? result.away
      ? undefined
      : "secondary"
    : isFinished
      ? isAwayWinner
        ? "primary"
        : "secondary"
      : "secondary";

  // Single score display for home or away
  if (type === "home") {
    return (
      <View style={styles.timeResultBadge}>
        <AppText
          variant="caption"
          style={[
            styles.resultText,
            { color: theme.colors.textSecondary },
            isLive && { color: "#3B82F6", fontWeight: "700" as const },
            isHomeWinner && styles.winnerResultText,
          ]}
        >
          {result.home ?? "-"}
        </AppText>
      </View>
    );
  }

  if (type === "away") {
    return (
      <View style={styles.timeResultBadge}>
        <AppText
          variant="caption"
          style={[
            styles.resultText,
            { color: theme.colors.textSecondary },
            isLive && { color: "#3B82F6", fontWeight: "700" as const },
            isAwayWinner && styles.winnerResultText,
          ]}
        >
          {result.away ?? "-"}
        </AppText>
      </View>
    );
  }

  // Both scores (original vertical layout)
  return (
    <View style={styles.timeResultContainer}>
      <View style={styles.timeResultColumn}>
        <View style={styles.timeResultBadge}>
          <AppText
            variant="caption"
            color={result.home ? homeScoreColor : "secondary"}
            style={[
              styles.resultText,
              result.home && isLive && { color: "#3B82F6", fontWeight: "700" as const },
              isHomeWinner && styles.winnerResultText,
            ]}
          >
            {result.home || "-"}
          </AppText>
        </View>
        <View style={styles.timeResultBadge}>
          <AppText
            variant="caption"
            color={result.away ? awayScoreColor : "secondary"}
            style={[
              styles.resultText,
              result.away && isLive && { color: "#3B82F6", fontWeight: "700" as const },
              isAwayWinner && styles.winnerResultText,
            ]}
          >
            {result.away || "-"}
          </AppText>
        </View>
      </View>
    </View>
  );
}

export const ResultDisplay = React.memo(ResultDisplayInner);

const styles = StyleSheet.create({
  timeResultContainer: {
    alignItems: "center",
    justifyContent: "flex-end",
    flexShrink: 0,
  },
  timeResultColumn: {
    flexDirection: "column",
    writingDirection: "ltr",
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
  },
  timeResultBadge: {
    width: 28,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  resultText: {
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 22,
    textAlignVertical: "center",
  },
  winnerResultText: {},
  cancelledText: {
    fontSize: 10,
    fontWeight: "500",
    textAlign: "center",
  },
});
