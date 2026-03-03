import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  interpolate,
  type SharedValue,
} from "react-native-reanimated";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";

const SCREEN_WIDTH = Dimensions.get("window").width;
const DOT_SIZE = 6;
const DOT_ACTIVE_SIZE = 8;
const DOT_GAP = 8;

type GroupPageIndicatorProps = {
  groupNames: string[];
  totalGroups: number;
  translateX: SharedValue<number>;
  currentIndexSV: SharedValue<number>;
  currentIndex: number;
  pageStep: number;
};

export function GroupPageIndicator({
  groupNames,
  totalGroups,
  translateX,
  currentIndexSV,
  currentIndex,
  pageStep,
}: GroupPageIndicatorProps) {
  const { theme } = useTheme();

  if (totalGroups <= 1) return null;

  return (
    <View style={styles.container}>
      <View style={styles.dotsRow}>
        {groupNames.map((_, i) => (
          <IndicatorDot
            key={i}
            index={i}
            translateX={translateX}
            currentIndexSV={currentIndexSV}
            pageStep={pageStep}
            activeColor={theme.colors.primary}
            inactiveColor={theme.colors.textDisabled}
          />
        ))}
      </View>
      <AppText
        variant="caption"
        color="secondary"
        numberOfLines={1}
        style={styles.groupName}
      >
        {groupNames[currentIndex] ?? ""}
      </AppText>
    </View>
  );
}

function IndicatorDot({
  index,
  translateX,
  currentIndexSV,
  pageStep,
  activeColor,
  inactiveColor,
}: {
  index: number;
  translateX: SharedValue<number>;
  currentIndexSV: SharedValue<number>;
  pageStep: number;
  activeColor: string;
  inactiveColor: string;
}) {
  const dotStyle = useAnimatedStyle(() => {
    // progress = currentIndex + drag fraction (drag left = positive fraction)
    const progress = currentIndexSV.value - translateX.value / pageStep;
    const distance = Math.abs(progress - index);

    const scale = interpolate(distance, [0, 1], [1.4, 1], "clamp");
    const opacity = interpolate(distance, [0, 1], [1, 0.35], "clamp");

    return {
      transform: [{ scale }],
      opacity,
      backgroundColor: distance < 0.5 ? activeColor : inactiveColor,
    };
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        dotStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 6,
    gap: 4,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: DOT_GAP,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  groupName: {
    fontSize: 11,
    textAlign: "center",
    maxWidth: SCREEN_WIDTH * 0.6,
  },
});
