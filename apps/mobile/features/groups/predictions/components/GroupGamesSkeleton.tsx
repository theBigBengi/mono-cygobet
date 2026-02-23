import React from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/lib/theme";
import { TIMELINE } from "../utils/constants";

/**
 * Skeleton layout that mirrors the real GroupGamesScreen:
 * SummaryCard → [DateHeader → LeaguePill → Card, Card] → [DateHeader → LeaguePill → Card, Card, Card]
 */

// Define skeleton structure: headers + cards in realistic grouping
const SKELETON_ITEMS: Array<{ type: "date" | "league" | "card" }> = [
  { type: "league" },
  { type: "card" },
  { type: "card" },
  { type: "date" },
  { type: "league" },
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
    <Animated.View style={[pulseStyle, styles.wrapper]}>
      {/* Timeline track — full height like real screen */}
      <View
        style={[styles.track, { backgroundColor: skeletonColor }]}
        pointerEvents="none"
      />

      {/* ── Summary card skeleton ── */}
      <View style={styles.summaryRow}>
        <View style={styles.timelineSpacer} />
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: theme.colors.cardBackground,
              borderColor: theme.colors.border,
              borderBottomColor: theme.colors.textSecondary + "40",
            },
          ]}
        >
          <View style={styles.summaryInner}>
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
        <View style={styles.rightSpacer} />
      </View>

      {/* ── Items: date headers, league pills, fixture cards ── */}
      {SKELETON_ITEMS.map((item, i) => {
        if (item.type === "date") {
          return (
            <View key={`date-${i}`} style={styles.sectionHeaderRow}>
              <View style={styles.sectionTimelineCol} />
              <View style={styles.sectionHeaderContent}>
                <View style={styles.dateRow}>
                  <View style={[styles.dateLine, { backgroundColor: skeletonColor }]} />
                  <View style={[styles.dateLabelPlaceholder, { backgroundColor: skeletonColor }]} />
                  <View style={[styles.dateLine, { backgroundColor: skeletonColor }]} />
                </View>
              </View>
            </View>
          );
        }

        if (item.type === "league") {
          return (
            <View key={`league-${i}`} style={styles.sectionHeaderRow}>
              <View style={styles.sectionTimelineCol} />
              <View style={styles.sectionHeaderContent}>
                <View
                  style={[
                    styles.leaguePill,
                    {
                      backgroundColor: theme.colors.textSecondary + "0C",
                      borderColor: theme.colors.textSecondary + "15",
                    },
                  ]}
                >
                  <View style={[styles.leaguePillText, { backgroundColor: skeletonColor }]} />
                </View>
              </View>
            </View>
          );
        }

        // Card
        const ci = cardIndex++;
        const isLast = i === SKELETON_ITEMS.length - 1;
        const nextIsCard = !isLast && SKELETON_ITEMS[i + 1]?.type === "card";

        return (
          <View key={`card-${i}`} style={[styles.cardOuterRow, nextIsCard && styles.cardSpacing]}>
            {/* Timeline column */}
            <View style={styles.timelineCol}>
              <View
                style={[
                  styles.fillLine,
                  {
                    backgroundColor: skeletonColor,
                    top: ci === 0 ? "50%" : -1,
                    bottom: isLast ? "50%" : -1,
                  },
                ]}
              />
              <View style={[styles.waypointDash, { backgroundColor: skeletonColor }]} />
              <View style={styles.timeTextArea}>
                <View style={[styles.timePlaceholder, { backgroundColor: skeletonColor }]} />
              </View>
            </View>

            {/* Content column */}
            <View style={styles.contentCol}>
              {/* Card + points row */}
              <View style={styles.cardContentRow}>
                <View
                  style={[
                    styles.matchCard,
                    {
                      backgroundColor: theme.colors.cardBackground,
                      borderColor: theme.colors.border,
                      borderBottomColor: theme.colors.textSecondary + "40",
                    },
                  ]}
                >
                  {/* Home team row */}
                  <View style={styles.teamRow}>
                    <View style={[styles.teamLogo, { backgroundColor: skeletonColor }]} />
                    <View style={[styles.teamName, { backgroundColor: skeletonColor, width: 90 + (ci % 3) * 20 }]} />
                    <View style={[styles.resultPlaceholder, { backgroundColor: skeletonColor }]} />
                    <View style={[styles.scoreInput, { backgroundColor: skeletonColor }]} />
                  </View>
                  {/* Away team row */}
                  <View style={styles.teamRow}>
                    <View style={[styles.teamLogo, { backgroundColor: skeletonColor }]} />
                    <View style={[styles.teamName, { backgroundColor: skeletonColor, width: 80 + (ci % 3) * 15 }]} />
                    <View style={[styles.resultPlaceholder, { backgroundColor: skeletonColor }]} />
                    <View style={[styles.scoreInput, { backgroundColor: skeletonColor }]} />
                  </View>
                </View>
                <View style={styles.rightSpacer} />
              </View>
            </View>
          </View>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  track: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: TIMELINE.TRACK_WIDTH,
  },

  /* ── Summary card ── */
  summaryRow: {
    flexDirection: "row",
    marginTop: 28,
    marginBottom: 20,
  },
  timelineSpacer: {
    width: TIMELINE.COLUMN_WIDTH,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderBottomWidth: 3,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  summaryInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  summaryStat: {
    alignItems: "center",
    gap: 4,
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

  /* ── Section headers ── */
  sectionHeaderRow: {
    flexDirection: "row",
  },
  sectionTimelineCol: {
    width: TIMELINE.COLUMN_WIDTH,
    alignItems: "center",
    alignSelf: "stretch",
  },
  sectionHeaderContent: {
    flex: 1,
    paddingLeft: 10,
    justifyContent: "center",
  },
  // Date header: line — label — line
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 15,
    paddingRight: TIMELINE.COLUMN_WIDTH,
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
  // League pill
  leaguePill: {
    alignSelf: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 15,
    marginRight: TIMELINE.COLUMN_WIDTH,
  },
  leaguePillText: {
    width: 100,
    height: 10,
    borderRadius: 3,
  },

  /* ── Fixture cards ── */
  cardOuterRow: {
    flexDirection: "row",
  },
  cardSpacing: {
    marginBottom: 30,
  },
  timelineCol: {
    width: TIMELINE.COLUMN_WIDTH,
    alignSelf: "stretch",
    justifyContent: "center",
  },
  fillLine: {
    position: "absolute",
    left: (TIMELINE.TRACK_WIDTH - TIMELINE.LINE_WIDTH) / 2,
    width: TIMELINE.LINE_WIDTH,
  },
  waypointDash: {
    width: TIMELINE.TRACK_WIDTH + 2,
    height: 2,
    borderRadius: 1,
    zIndex: 2,
  },
  timeTextArea: {
    position: "absolute",
    left: TIMELINE.TRACK_WIDTH,
    right: -10,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  timePlaceholder: {
    width: 24,
    height: 10,
    borderRadius: 3,
  },
  contentCol: {
    flex: 1,
    paddingLeft: 10,
  },

  /* ── Card + points ── */
  cardContentRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  matchCard: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderBottomWidth: 3,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  teamLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  teamName: {
    height: 14,
    borderRadius: 4,
    flex: 1,
  },
  resultPlaceholder: {
    width: 18,
    height: 18,
    borderRadius: 4,
  },
  scoreInput: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  rightSpacer: {
    width: TIMELINE.COLUMN_WIDTH - 6,
  },
});
