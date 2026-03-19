import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTheme, spacing } from "@/lib/theme";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const CARD_GAP = 12;
const PEEK = 48;

type Props = {
  cardHeight?: number;
  contentTop?: number;
};

export function PredictAllCardSkeleton({ cardHeight, contentTop = 0 }: Props) {
  const { theme } = useTheme();
  const height = cardHeight ?? SCREEN_HEIGHT - PEEK - CARD_GAP;
  const skeletonColor = theme.colors.border;

  const opacity = useSharedValue(0.5);
  React.useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [opacity]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View
      style={[
        styles.card,
        {
          height,
          backgroundColor: theme.colors.cardBackground,
        },
      ]}
    >
      <Animated.View
        style={[styles.cardInner, { paddingTop: contentTop }, pulseStyle]}
      >
        {/* Collapsed content row — matches cardContentRow */}
        <View style={styles.contentRow}>
          {/* Left slider column — matches sliderContainer */}
          <View style={styles.sliderColumn}>
            <View
              style={[styles.sliderBar, { backgroundColor: skeletonColor }]}
            />
          </View>

          {/* Center — matches centerContent */}
          <View style={styles.centerContent}>
            <View style={styles.centerTrack}>
              {/* Fixture info — matches fixtureInfo (absolute above) */}
              <View style={styles.fixtureInfo}>
                <View
                  style={[
                    styles.textBar,
                    { width: 140, backgroundColor: skeletonColor },
                  ]}
                />
                <View
                  style={[
                    styles.textBar,
                    {
                      width: 90,
                      marginTop: 4,
                      backgroundColor: skeletonColor,
                    },
                  ]}
                />
              </View>

              {/* Score center — matches scoreCenter */}
              <View style={styles.scoreCenter}>
                <View style={styles.scoreRow}>
                  {/* Home score box (100x100, borderRadius 4) */}
                  <View
                    style={[
                      styles.scoreBox,
                      { backgroundColor: skeletonColor },
                    ]}
                  />
                  {/* Separator dash */}
                  <View
                    style={[
                      styles.separatorBar,
                      { backgroundColor: skeletonColor },
                    ]}
                  />
                  {/* Away score box (100x100, borderRadius 4) */}
                  <View
                    style={[
                      styles.scoreBox,
                      { backgroundColor: skeletonColor },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Right slider column — matches sliderContainer */}
          <View style={styles.sliderColumn}>
            <View
              style={[styles.sliderBar, { backgroundColor: skeletonColor }]}
            />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 32,
    overflow: "hidden",
  },
  cardInner: {
    flex: 1,
  },
  contentRow: {
    flex: 1,
    flexDirection: "row",
  },
  sliderColumn: {
    width: 40,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.ms,
    alignItems: "center",
    justifyContent: "center",
  },
  sliderBar: {
    width: 6,
    height: 484,
    borderRadius: 3,
  },
  centerContent: {
    flex: 1,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.ms,
    justifyContent: "center",
  },
  centerTrack: {
    height: 484,
    position: "relative",
  },
  fixtureInfo: {
    position: "absolute",
    bottom: "100%",
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
  },
  textBar: {
    height: 10,
    borderRadius: 5,
  },
  scoreCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -260,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    writingDirection: "ltr",
  },
  scoreBox: {
    width: 100,
    height: 100,
    borderRadius: spacing.xs,
  },
  separatorBar: {
    width: spacing.md,
    height: spacing.xs,
    borderRadius: spacing.xxs,
    marginHorizontal: spacing.xs,
  },
});
