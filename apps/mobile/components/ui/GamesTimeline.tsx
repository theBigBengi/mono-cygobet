// components/ui/GamesTimeline.tsx
// Scrollable timeline with dots for each game.
// Tap a dot to center it and show game info.

import React, { useRef, useState, useEffect, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, LayoutChangeEvent } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme";
import { AppText } from "./AppText";

export interface TimelineGame {
  id: string;
  type: "success" | "missed" | "waiting" | "upcoming" | "cancelled";
  homeTeam: string;
  awayTeam: string;
  countdown: string | null;
  /** Score for finished games */
  score?: {
    home: number;
    away: number;
  } | null;
  /** User's prediction */
  prediction?: {
    home: string;
    away: string;
  } | null;
  /** Status label for cancelled/postponed games */
  statusLabel?: string | null;
}

export interface GamesTimelineProps {
  /** Array of games with their status */
  games: TimelineGame[];
  /** Dot size in pixels */
  dotSize?: number;
  /** Gap between dots in pixels */
  dotGap?: number;
  /** Index of initially selected dot (defaults to first future game) */
  initialSelectedIndex?: number;
  /** Controlled selected index (when provided, component becomes controlled) */
  selectedIndex?: number;
  /** Callback when a game is selected */
  onGameSelect?: (game: TimelineGame, index: number) => void;
  /** Hide the labels above and below the timeline (compact mode) */
  hideLabels?: boolean;
  /** Show game number below selected dot (works with hideLabels) */
  showGameNumber?: boolean;
  /** Custom label to show below selected dot (overrides game number) */
  customBottomLabel?: string | null;
  /** Show a trophy dot at the end of the timeline */
  showTrophyEnd?: boolean;
}

const DOT_GAP = 12;

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

export function GamesTimeline({
  games,
  dotSize = 14,
  dotGap = DOT_GAP,
  initialSelectedIndex,
  selectedIndex: controlledSelectedIndex,
  onGameSelect,
  hideLabels = false,
  showGameNumber = false,
  customBottomLabel,
  showTrophyEnd = false,
}: GamesTimelineProps) {
  const { theme } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [internalSelectedIndex, setInternalSelectedIndex] = useState<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Use controlled index if provided, otherwise use internal state
  const isControlled = controlledSelectedIndex !== undefined;
  const selectedIndex = isControlled ? controlledSelectedIndex : internalSelectedIndex;

  const gamesCount = games.length;
  if (gamesCount === 0) return null;

  // Total dots including trophy if shown
  const total = showTrophyEnd ? gamesCount + 1 : gamesCount;

  // Calculate dot width including gap
  const dotWidth = dotSize + dotGap;

  // Find first future game index for initial selection
  const firstFutureIndex = games.findIndex(g => g.type === "waiting" || g.type === "upcoming");
  const defaultIndex = initialSelectedIndex ?? (firstFutureIndex >= 0 ? firstFutureIndex : total - 1);

  const scrollToIndex = useCallback((index: number, animated = true) => {
    if (!scrollViewRef.current || containerWidth === 0) return;

    // Since we have paddingHorizontal = containerWidth/2 - dotWidth/2,
    // the first dot is already centered. To center dot at index,
    // we just scroll to index * dotWidth.
    const scrollX = index * dotWidth;

    scrollViewRef.current.scrollTo({ x: scrollX, animated });
  }, [containerWidth, dotWidth]);

  // Set initial selection after layout (only for uncontrolled mode)
  useEffect(() => {
    if (!isControlled && !isInitialized && containerWidth > 0) {
      setInternalSelectedIndex(defaultIndex);
      // Small delay to ensure ScrollView is ready
      setTimeout(() => {
        scrollToIndex(defaultIndex, false);
      }, 50);
      setIsInitialized(true);
    }
  }, [containerWidth, defaultIndex, isInitialized, scrollToIndex, isControlled]);

  // Scroll when controlled index changes
  useEffect(() => {
    if (isControlled && containerWidth > 0 && controlledSelectedIndex !== undefined) {
      scrollToIndex(controlledSelectedIndex, true);
    }
  }, [isControlled, controlledSelectedIndex, containerWidth, scrollToIndex]);

  const handleDotPress = (index: number) => {
    if (!isControlled) {
      setInternalSelectedIndex(index);
    }
    scrollToIndex(index);
    // Call onGameSelect for any dot (including trophy - game will be undefined)
    if (onGameSelect) {
      onGameSelect(games[index], index);
    }
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  const getBackgroundColor = (type: TimelineGame["type"]) => {
    switch (type) {
      case "success":
        return theme.colors.primary;
      case "missed":
        return theme.colors.primary;
      case "waiting":
        return theme.colors.border;
      case "upcoming":
        return theme.colors.background;
      case "cancelled":
        return theme.colors.primary;
    }
  };

  const getIcon = (type: TimelineGame["type"]): { name: string; color: string } | null => {
    switch (type) {
      case "success":
        return { name: "checkmark-sharp", color: theme.colors.primaryText };
      case "missed":
        return { name: "close-sharp", color: theme.colors.primaryText };
      case "waiting":
        return { name: "help-sharp", color: theme.colors.textSecondary };
      case "upcoming":
        return null;
      case "cancelled":
        return { name: "remove-sharp", color: theme.colors.primaryText };
    }
  };

  const isEmptyDot = (type: TimelineGame["type"]) => type === "upcoming";

  // Calculate finished count for progress line
  const finishedGamesCount = games.filter(g => g.type === "success" || g.type === "missed" || g.type === "cancelled").length;
  // If all games are finished and we have trophy, extend line to trophy
  const allGamesFinished = finishedGamesCount === gamesCount;
  const finishedCount = showTrophyEnd && allGamesFinished ? finishedGamesCount + 1 : finishedGamesCount;

  // Selected game info
  const selectedGame = selectedIndex !== null ? games[selectedIndex] : null;
  const isFinished = selectedGame?.type === "success" || selectedGame?.type === "missed";

  // Game number label
  const gameNumberLabel = selectedIndex !== null ? `${selectedIndex + 1}/${total}` : null;

  // Match label - include score for finished games
  const matchLabel = selectedGame
    ? isFinished && selectedGame.score
      ? `${getShortName(selectedGame.homeTeam)} ${selectedGame.score.home}-${selectedGame.score.away} ${getShortName(selectedGame.awayTeam)}`
      : `${getShortName(selectedGame.homeTeam)} - ${getShortName(selectedGame.awayTeam)}`
    : null;

  // Build bottom label based on game state
  const isCancelled = selectedGame?.type === "cancelled";

  const getBottomLabel = () => {
    if (!selectedGame) return null;

    // Cancelled/postponed - show status
    if (isCancelled) {
      return selectedGame.statusLabel ?? null;
    }

    if (isFinished) {
      // Score is already shown in matchLabel above, so only show prediction here
      if (selectedGame.prediction?.home && selectedGame.prediction?.away) {
        return `(${selectedGame.prediction.home}-${selectedGame.prediction.away})`;
      }
      return "—";
    }

    // Future game - show prediction if exists, otherwise countdown
    if (selectedGame.prediction?.home && selectedGame.prediction?.away) {
      return `${selectedGame.prediction.home} - ${selectedGame.prediction.away}`;
    }
    return selectedGame.countdown;
  };

  const bottomLabel = getBottomLabel();

  return (
    <View style={styles.wrapper}>
      {/* Game number and match label above with connector */}
      {!hideLabels && matchLabel && (
        <View style={styles.labelConnector}>
          {gameNumberLabel && (
            <AppText style={[styles.gameNumberLabel, { color: theme.colors.textSecondary }]}>
              {gameNumberLabel}
            </AppText>
          )}
          <AppText variant="caption" color="secondary">
            {matchLabel}
          </AppText>
          <View style={[styles.connectorLine, { backgroundColor: theme.colors.border }]} />
        </View>
      )}

      <View style={styles.container} onLayout={handleLayout}>
        {/* Scrollable dots with line */}
        {containerWidth > 0 && (
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.dotsContent,
              { paddingHorizontal: containerWidth / 2 - dotWidth / 2 },
            ]}
          >
            {/* Wrapper for dots and line together */}
            <View style={[styles.dotsAndLineWrapper, { width: total * dotWidth }]}>
              {/* Timeline line - from center of first dot to center of last dot */}
              <View
                style={[
                  styles.line,
                  {
                    backgroundColor: theme.colors.border,
                    width: (total - 1) * dotWidth,
                    left: dotWidth / 2,
                  },
                ]}
              >
                <View
                  style={[
                    styles.lineFilled,
                    {
                      width: finishedCount * dotWidth,
                      backgroundColor: theme.colors.primary,
                    },
                  ]}
                />
              </View>

              {/* Dots row */}
              <View style={styles.dotsRow}>
                {games.map((game, index) => {
                  const icon = getIcon(game.type);
                  const isSelected = index === selectedIndex;
                  const size = isSelected ? dotSize + 4 : dotSize;

                  return (
                    <Pressable
                      key={game.id}
                      onPress={() => handleDotPress(index)}
                      style={[styles.dotWrapper, { width: dotWidth }]}
                    >
                      <View
                        style={[
                          styles.dot,
                          {
                            width: size,
                            height: size,
                            borderRadius: size / 2,
                            backgroundColor: getBackgroundColor(game.type),
                            borderWidth: isEmptyDot(game.type) ? 2 : 0,
                            borderColor: isSelected ? theme.colors.textSecondary : theme.colors.border,
                          },
                        ]}
                      >
                        {icon && (
                          <Ionicons
                            name={icon.name as any}
                            size={size - 4}
                            color={icon.color}
                          />
                        )}
                      </View>
                    </Pressable>
                  );
                })}
                {/* Trophy dot at the end */}
                {showTrophyEnd && (() => {
                  const trophyIndex = gamesCount;
                  const isTrophySelected = selectedIndex === trophyIndex;
                  const trophySize = isTrophySelected ? dotSize + 4 : dotSize;
                  return (
                    <Pressable
                      onPress={() => handleDotPress(trophyIndex)}
                      style={[styles.dotWrapper, { width: dotWidth }]}
                    >
                      <View
                        style={[
                          styles.dot,
                          {
                            width: trophySize,
                            height: trophySize,
                            borderRadius: trophySize / 2,
                            backgroundColor: allGamesFinished ? theme.colors.warning : theme.colors.surface,
                            borderWidth: allGamesFinished ? 0 : 1,
                            borderColor: isTrophySelected ? theme.colors.textSecondary : theme.colors.border,
                          },
                        ]}
                      >
                        <Ionicons
                          name="trophy"
                          size={trophySize - 6}
                          color={allGamesFinished ? "#fff" : theme.colors.textSecondary}
                        />
                      </View>
                    </Pressable>
                  );
                })()}
              </View>
            </View>
          </ScrollView>
        )}
      </View>

      {/* Bottom label (score or countdown) with connector */}
      {!hideLabels && bottomLabel && (
        <View style={styles.labelConnector}>
          <View style={[styles.connectorLine, { backgroundColor: theme.colors.border }]} />
          <AppText style={[styles.bottomLabel, { color: theme.colors.textSecondary }]}>
            {bottomLabel}
          </AppText>
        </View>
      )}

      {/* Custom label or game number below selected dot (compact mode) */}
      {(customBottomLabel || (showGameNumber && gameNumberLabel)) && (
        <View style={styles.labelConnector}>
          <View style={[styles.connectorLine, { backgroundColor: theme.colors.border }]} />
          <AppText style={[styles.gameNumberLabel, { color: theme.colors.textSecondary }]}>
            {customBottomLabel ?? gameNumberLabel}
          </AppText>
        </View>
      )}
    </View>
  );
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
    left: 0,
    top: 11,
    height: 2,
    borderRadius: 1,
  },
  lineFilled: {
    height: "100%",
    borderRadius: 1,
  },
  dotsContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  dotsAndLineWrapper: {
    position: "relative",
    height: 24,
    justifyContent: "center",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dotWrapper: {
    alignItems: "center",
    justifyContent: "center",
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
  bottomLabel: {
    fontSize: 10,
  },
  gameNumberLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
});
