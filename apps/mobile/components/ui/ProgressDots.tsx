// components/ui/ProgressDots.tsx
// Timeline with dots showing prediction status vs game completion.
// If <= 7 games: show actual dots
// If > 7 games: show 7 proportional dots centered on next game

import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme";
import { AppText } from "./AppText";

export interface ProgressDotsProps {
  /** Games that user predicted and have finished (green with ✓) */
  predictedAndFinished: number;
  /** Games that finished but user didn't predict - missed (red with ✗) */
  missed: number;
  /** Games that user predicted but haven't started yet (blue with ✓) */
  predictedWaiting: number;
  /** Games that haven't started and user hasn't predicted (empty) */
  upcoming: number;
  /** Dot size in pixels */
  dotSize?: number;
  /** Next game info to display around center dot */
  nextGame?: {
    homeTeam: string;
    awayTeam: string;
    countdown: string | null;
  } | null;
}

type DotType = "success" | "missed" | "waiting" | "upcoming";

const MAX_DOTS = 7;

/**
 * Get short team name (first 3 letters or abbreviation)
 */
function getShortName(name: string): string {
  if (!name) return "???";
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return words.map(w => w[0]).join("").toUpperCase().slice(0, 3);
  }
  return name.slice(0, 3).toUpperCase();
}

export function ProgressDots({
  predictedAndFinished,
  missed,
  predictedWaiting,
  upcoming,
  dotSize = 14,
  nextGame,
}: ProgressDotsProps) {
  const { theme } = useTheme();

  const totalFinished = predictedAndFinished + missed;
  const totalFuture = predictedWaiting + upcoming;
  const total = totalFinished + totalFuture;

  if (total === 0) return null;

  // Build dots array
  let dots: DotType[];
  let centerIndex: number;

  if (total <= MAX_DOTS) {
    // Show actual dots for each game
    dots = [];
    for (let i = 0; i < predictedAndFinished; i++) dots.push("success");
    for (let i = 0; i < missed; i++) dots.push("missed");
    for (let i = 0; i < predictedWaiting; i++) dots.push("waiting");
    for (let i = 0; i < upcoming; i++) dots.push("upcoming");

    // Center is the first future game (or last game if all finished)
    centerIndex = totalFuture > 0 ? totalFinished : total - 1;
  } else {
    // Show 7 proportional dots centered on next game
    centerIndex = 3; // Middle of 7 dots (0-indexed)
    dots = buildProportionalDots(
      predictedAndFinished,
      missed,
      predictedWaiting,
      upcoming,
      MAX_DOTS,
      centerIndex
    );
  }

  const getBackgroundColor = (type: DotType) => {
    switch (type) {
      case "success":
        return theme.colors.success;
      case "missed":
        return theme.colors.danger;
      case "waiting":
        return theme.colors.primary;
      case "upcoming":
        return theme.colors.surface;
    }
  };

  const getIcon = (type: DotType): { name: string; color: string } | null => {
    switch (type) {
      case "success":
        return { name: "checkmark", color: "#fff" };
      case "missed":
        return { name: "close", color: "#fff" };
      case "waiting":
        return { name: "checkmark", color: "#fff" };
      case "upcoming":
        return null;
    }
  };

  const isUpcoming = (type: DotType) => type === "upcoming";

  // Calculate line fill percentage based on finished games
  const fillPercent = total > 0 ? (totalFinished / total) * 100 : 0;

  // Format next game info
  const countdownLabel = nextGame?.countdown ?? null;
  const matchLabel = nextGame
    ? `${getShortName(nextGame.homeTeam)} - ${getShortName(nextGame.awayTeam)}`
    : null;

  return (
    <View style={styles.wrapper}>
      {/* Match label above with connector */}
      {matchLabel && totalFuture > 0 && (
        <View style={styles.labelConnector}>
          <AppText variant="caption" color="secondary">
            {matchLabel}
          </AppText>
          <View style={[styles.connectorLine, { backgroundColor: theme.colors.border }]} />
        </View>
      )}

      <View style={styles.container}>
        {/* Timeline line */}
        <View
          style={[
            styles.line,
            { backgroundColor: theme.colors.border },
          ]}
        >
          {/* Filled portion for finished games */}
          <View
            style={[
              styles.lineFilled,
              {
                width: `${fillPercent}%`,
                backgroundColor: theme.colors.textSecondary,
              },
            ]}
          />
        </View>

        {/* Dots */}
        <View style={styles.dotsRow}>
          {dots.map((type, index) => {
            const icon = getIcon(type);
            const isCenter = index === centerIndex && totalFuture > 0;
            const size = isCenter ? dotSize + 4 : dotSize;

            return (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: getBackgroundColor(type),
                    borderWidth: isUpcoming(type) ? 2 : 0,
                    borderColor: isCenter ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                {icon && (
                  <Ionicons
                    name={icon.name as any}
                    size={size - 6}
                    color={icon.color}
                  />
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* Countdown label below with connector */}
      {countdownLabel && totalFuture > 0 && (
        <View style={styles.labelConnector}>
          <View style={[styles.connectorLine, { backgroundColor: theme.colors.border }]} />
          <AppText style={[styles.countdownLabel, { color: theme.colors.textSecondary }]}>
            {countdownLabel}
          </AppText>
        </View>
      )}
    </View>
  );
}

/**
 * Build 7 proportional dots centered on the next game
 */
function buildProportionalDots(
  predictedAndFinished: number,
  missed: number,
  predictedWaiting: number,
  upcoming: number,
  totalDots: number,
  centerIndex: number
): DotType[] {
  const totalFinished = predictedAndFinished + missed;
  const totalFuture = predictedWaiting + upcoming;

  const dots: DotType[] = [];

  // Left side: finished games (proportional)
  const leftSlots = centerIndex;
  if (totalFinished > 0) {
    const successRatio = predictedAndFinished / totalFinished;
    for (let i = 0; i < leftSlots; i++) {
      const pos = (i + 0.5) / leftSlots;
      dots.push(pos <= successRatio ? "success" : "missed");
    }
  } else {
    // No finished games - show empty
    for (let i = 0; i < leftSlots; i++) {
      dots.push("upcoming");
    }
  }

  // Center: next game
  if (totalFuture > 0) {
    dots.push(predictedWaiting > 0 ? "waiting" : "upcoming");
  } else {
    // All finished - show last result
    dots.push(missed > 0 ? "missed" : "success");
  }

  // Right side: future games after next (proportional)
  const rightSlots = totalDots - centerIndex - 1;
  const remainingWaiting = Math.max(0, predictedWaiting - (predictedWaiting > 0 ? 1 : 0));
  const remainingUpcoming = Math.max(0, upcoming - (predictedWaiting === 0 ? 1 : 0));
  const remainingFuture = remainingWaiting + remainingUpcoming;

  if (remainingFuture > 0) {
    const waitingRatio = remainingWaiting / remainingFuture;
    for (let i = 0; i < rightSlots; i++) {
      const pos = (i + 0.5) / rightSlots;
      dots.push(pos <= waitingRatio ? "waiting" : "upcoming");
    }
  } else {
    // No more future games
    for (let i = 0; i < rightSlots; i++) {
      dots.push("upcoming");
    }
  }

  return dots;
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
  },
  container: {
    position: "relative",
    height: 24,
    justifyContent: "center",
    width: "100%",
  },
  line: {
    position: "absolute",
    left: 7,
    right: 7,
    height: 2,
    borderRadius: 1,
  },
  lineFilled: {
    height: "100%",
    borderRadius: 1,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dot: {
    alignItems: "center",
    justifyContent: "center",
  },
  labelConnector: {
    alignItems: "center",
    marginTop: 2,
  },
  connectorLine: {
    width: 1,
    height: 8,
  },
  countdownLabel: {
    fontSize: 10,
  },
});
