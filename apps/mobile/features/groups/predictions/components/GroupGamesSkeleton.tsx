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

const SKELETON_COUNT = 5;

export function GroupGamesSkeleton() {
  const { theme } = useTheme();
  const skeletonColor = theme.colors.textSecondary + "18";
  const skeletonColorStrong = theme.colors.textSecondary + "12";

  // Subtle pulse animation
  const opacity = useSharedValue(0.5);
  React.useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [opacity]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[pulseStyle, styles.wrapper]}>
      {/* Skeleton timeline track — full height like the real one */}
      <View
        style={[styles.track, { backgroundColor: skeletonColor }]}
        pointerEvents="none"
      />

      {/* Summary card skeleton */}
      <View style={styles.summaryRow}>
        <View style={styles.spacer} />
        <View
          style={[styles.summaryBox, { backgroundColor: skeletonColor }]}
        />
        <View style={styles.spacer} />
      </View>

      {/* Card skeletons */}
      {Array.from({ length: SKELETON_COUNT }, (_, i) => (
        <View key={i} style={styles.cardRow}>
          <View style={styles.timelineCol}>
            {/* Vertical fill line skeleton */}
            <View
              style={[
                styles.fillLine,
                {
                  backgroundColor: skeletonColorStrong,
                  top: i === 0 ? "50%" : -1,
                  bottom: i === SKELETON_COUNT - 1 ? "50%" : -1,
                },
              ]}
            />
            <View
              style={[styles.dash, { backgroundColor: skeletonColorStrong }]}
            />
          </View>
          <View style={styles.contentCol}>
            <View
              style={[
                styles.leagueLine,
                { backgroundColor: skeletonColorStrong },
              ]}
            />
            <View style={styles.cardContentRow}>
              <View
                style={[styles.cardBox, { backgroundColor: skeletonColor }]}
              />
              <View style={styles.spacer} />
            </View>
          </View>
        </View>
      ))}
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
  summaryRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  spacer: {
    width: TIMELINE.COLUMN_WIDTH,
  },
  summaryBox: {
    flex: 1,
    height: 60,
    borderRadius: 10,
  },
  cardRow: {
    flexDirection: "row",
  },
  timelineCol: {
    width: TIMELINE.COLUMN_WIDTH,
    alignItems: "flex-start",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  fillLine: {
    position: "absolute",
    left: (TIMELINE.TRACK_WIDTH - TIMELINE.LINE_WIDTH) / 2,
    width: TIMELINE.LINE_WIDTH,
  },
  dash: {
    width: TIMELINE.TRACK_WIDTH + 8,
    height: 2,
    borderRadius: 1,
    zIndex: 2,
  },
  contentCol: {
    flex: 1,
    paddingBottom: 20,
  },
  leagueLine: {
    width: 100,
    height: 11,
    borderRadius: 4,
    marginBottom: 6,
    marginLeft: 4,
  },
  cardContentRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardBox: {
    flex: 1,
    height: 116,
    borderRadius: 10,
  },
});
