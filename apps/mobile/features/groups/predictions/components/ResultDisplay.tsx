import React from "react";
import { View, StyleSheet } from "react-native";
import { AppText } from "@/components/ui";
import { LIVE_RESULT_COLOR } from "../utils/constants";
import type { GameResultOrTime } from "../utils/fixture-helpers";

type ResultDisplayProps = {
  result: GameResultOrTime;
  isLive: boolean;
  isFinished: boolean;
  isCancelled: boolean;
  isHomeWinner: boolean;
  isAwayWinner: boolean;
};

/**
 * Displays game result scores vertically, or status text for cancelled games
 */
export function ResultDisplay({
  result,
  isLive,
  isFinished,
  isCancelled,
  isHomeWinner,
  isAwayWinner,
}: ResultDisplayProps) {
  if (!result || (!isLive && !isFinished && !isCancelled)) {
    return null;
  }

  // Cancelled games: show status text (e.g. "Postponed", "Cancelled")
  if (isCancelled) {
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

  return (
    <View style={styles.timeResultContainer}>
      <View style={styles.timeResultColumn}>
        <View style={styles.timeResultBadge}>
          <AppText
            variant="caption"
            color={result.home ? (isLive ? undefined : "secondary") : "secondary"}
            style={[
              styles.resultText,
              result.home && isLive && styles.liveResultText,
              isHomeWinner && styles.winnerResultText,
            ]}
          >
            {result.home || "-"}
          </AppText>
        </View>
        <View style={styles.timeResultBadge}>
          <AppText
            variant="caption"
            color={result.away ? (isLive ? undefined : "secondary") : "secondary"}
            style={[
              styles.resultText,
              result.away && isLive && styles.liveResultText,
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

const styles = StyleSheet.create({
  timeResultContainer: {
    alignItems: "center",
    justifyContent: "flex-end",
    flexShrink: 0,
  },
  timeResultColumn: {
    flexDirection: "column",
    direction: "ltr",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  timeResultBadge: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  resultText: {
    fontSize: 13,
    fontWeight: "400",
  },
  liveResultText: {
    color: LIVE_RESULT_COLOR,
    fontWeight: "700",
  },
  winnerResultText: {
    fontWeight: "700",
  },
  cancelledText: {
    fontSize: 10,
    fontWeight: "500",
    textAlign: "center",
  },
});
