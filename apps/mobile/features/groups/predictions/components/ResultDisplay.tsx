import React from "react";
import { View, StyleSheet } from "react-native";
import { AppText } from "@/components/ui";
import { LIVE_RESULT_COLOR } from "../utils/constants";
import type { GameResultOrTime } from "../utils/fixture-helpers";

type ResultDisplayProps = {
  result: GameResultOrTime;
  isLive: boolean;
  isFinished: boolean;
  isHomeWinner: boolean;
  isAwayWinner: boolean;
};

/**
 * Displays game result scores vertically
 * Only shown when game is live or finished
 */
export function ResultDisplay({
  result,
  isLive,
  isFinished,
  isHomeWinner,
  isAwayWinner,
}: ResultDisplayProps) {
  if (!result || (!isLive && !isFinished)) {
    return null;
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
});
