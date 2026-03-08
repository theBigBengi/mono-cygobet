import React from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/lib/theme";

/**
 * Skeleton layout that mirrors the real GroupGamesScreen:
 * SummaryCard → [DateHeader → Card, Card] → [DateHeader → Card, Card, Card]
 *
 * Dimensions match actual components:
 * - GamesSummaryCard: borderRadius 10, borderWidth 1, stat gap 2
 * - MatchPredictionCardVertical: borderRadius 10, borderWidth 1, paddingH 12, paddingV 10
 *   - LeagueInfoRow: paddingH 12, paddingV 6
 *   - TeamRow: logo 30x30, name height 36, gap 8
 *   - ScoreInput: 36x36 in predictionColumn width 52
 * - Section headers: paddingLeft 4, date line height 1.5
 */

const SKELETON_ITEMS: Array<{ type: "date" | "card" }> = [
  { type: "card" },
  { type: "card" },
  { type: "date" },
  { type: "card" },
  { type: "card" },
  { type: "card" },
];

export function GroupGamesSkeleton() {
  const { theme } = useTheme();
  const skeletonColor = theme.colors.border;

  // Subtle pulse animation
  const opacity = useSharedValue(0.5);
  React.useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [opacity]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  let cardIndex = 0;

  return (
    <Animated.View style={pulseStyle}>
      {/* ── Summary card skeleton ── */}
      <View style={styles.summaryWrapper}>
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: theme.colors.cardBackground,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.summaryRow}>
            {[0, 1, 2].map((j) => (
              <React.Fragment key={j}>
                {j > 0 && (
                  <View style={[styles.summaryDivider, { backgroundColor: theme.colors.border }]} />
                )}
                <View style={styles.summaryStat}>
                  <View style={[styles.summaryIcon, { backgroundColor: skeletonColor }]} />
                  <View style={[styles.summaryValue, { backgroundColor: skeletonColor }]} />
                  <View style={[styles.summaryLabel, { backgroundColor: skeletonColor }]} />
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>
      </View>

      {/* ── Items: date headers + fixture cards ── */}
      {SKELETON_ITEMS.map((item, i) => {
        if (item.type === "date") {
          return (
            <View key={`date-${i}`} style={styles.sectionHeaderContent}>
              <View style={styles.dateRow}>
                <View style={[styles.dateLine, { backgroundColor: skeletonColor }]} />
                <View style={[styles.dateLabelPlaceholder, { backgroundColor: skeletonColor }]} />
                <View style={[styles.dateLine, { backgroundColor: skeletonColor }]} />
              </View>
            </View>
          );
        }

        // Card
        const ci = cardIndex++;

        return (
          <View key={`card-${ci}`} style={styles.cardOuter}>
            <View
              style={[
                styles.matchCard,
                {
                  backgroundColor: theme.colors.cardBackground,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              {/* League info row */}
              <View
                style={[
                  styles.leagueInfoRow,
                  { backgroundColor: theme.colors.textSecondary + "08" },
                ]}
              >
                <View style={[styles.leagueTextPlaceholder, { backgroundColor: skeletonColor, width: 70 + (ci % 3) * 20 }]} />
                <View style={[styles.leagueSeparator, { backgroundColor: skeletonColor }]} />
                <View style={[styles.leagueTextPlaceholder, { backgroundColor: skeletonColor, width: 20 }]} />
                <View style={{ flex: 1 }} />
                <View style={[styles.leagueTimePlaceholder, { backgroundColor: skeletonColor }]} />
                <View style={[styles.leagueDivider, { backgroundColor: theme.colors.border }]} />
                <View style={styles.predictionColumn} />
              </View>

              {/* Match content */}
              <View style={styles.matchContent}>
                {/* Home team row */}
                <View style={styles.teamRow}>
                  <View style={styles.teamPressable}>
                    <View style={[styles.teamLogo, { backgroundColor: skeletonColor }]} />
                    <View style={[styles.teamName, { backgroundColor: skeletonColor, width: 80 + (ci % 3) * 25 }]} />
                  </View>
                  <View style={styles.predictionColumn}>
                    <View style={[styles.scoreInput, { backgroundColor: skeletonColor }]} />
                  </View>
                </View>
                {/* Away team row */}
                <View style={styles.teamRow}>
                  <View style={styles.teamPressable}>
                    <View style={[styles.teamLogo, { backgroundColor: skeletonColor }]} />
                    <View style={[styles.teamName, { backgroundColor: skeletonColor, width: 90 + (ci % 3) * 15 }]} />
                  </View>
                  <View style={styles.predictionColumn}>
                    <View style={[styles.scoreInput, { backgroundColor: skeletonColor }]} />
                  </View>
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  /* ── Summary card (matches GamesSummaryCard) ── */
  summaryWrapper: {
    marginTop: 20,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  summaryStat: {
    alignItems: "center",
    gap: 2,
    flex: 1,
  },
  summaryIcon: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  summaryValue: {
    width: 32,
    height: 18,
    borderRadius: 4,
  },
  summaryLabel: {
    width: 28,
    height: 9,
    borderRadius: 3,
  },
  summaryDivider: {
    width: 1,
    height: 28,
  },

  /* ── Section headers (matches GroupGamesScreen sectionHeaderContent) ── */
  sectionHeaderContent: {
    paddingStart: 4,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 8,
    paddingBottom: 20,
  },
  dateLine: {
    flex: 1,
    height: 1.5,
  },
  dateLabelPlaceholder: {
    width: 80,
    height: 11,
    borderRadius: 4,
  },

  /* ── Fixture cards (matches MatchPredictionCardVertical) ── */
  cardOuter: {
    marginBottom: 12,
  },
  matchCard: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  /* League info row */
  leagueInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    marginHorizontal: -12,
    marginTop: -10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  leagueTextPlaceholder: {
    height: 10,
    borderRadius: 3,
  },
  leagueSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    opacity: 0.4,
  },
  leagueTimePlaceholder: {
    width: 32,
    height: 10,
    borderRadius: 3,
  },
  leagueDivider: {
    width: 1,
    alignSelf: "stretch",
    marginVertical: -6,
    opacity: 0.5,
  },
  predictionColumn: {
    width: 52,
    alignItems: "center",
  },

  /* Match content */
  matchContent: {
    gap: 6,
  },
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  teamPressable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 36,
  },
  teamLogo: {
    width: 30,
    height: 30,
    borderRadius: 6,
  },
  teamName: {
    height: 14,
    borderRadius: 4,
  },
  scoreInput: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
});
