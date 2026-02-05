import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  runOnJS,
  withSpring,
  withTiming,
  interpolate,
  interpolateColor,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/lib/theme";

const DIGITS = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0] as const;
const ROW_HEIGHT = 32;
const NUM_DIGITS = DIGITS.length; // 10
const TRACK_HEIGHT = NUM_DIGITS * ROW_HEIGHT; // 320
const TAB_HEIGHT = 40;
const TAB_WIDTH = 52;
const CONTAINER_WIDTH = 44;

// 11 rows: 10 digits + dash; MAX_Y = 10 * ROW_HEIGHT
const MAX_Y = 10 * ROW_HEIGHT; // 320

// value 9 → y=0, value 0 → y=9*ROW_HEIGHT
const valueToY = (value: number) => (9 - value) * ROW_HEIGHT;

function triggerHaptic() {
  if (process.env.EXPO_OS === "ios") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

export type ScoreSliderProps = {
  side: "home" | "away";
  value?: number | null;
  onValueChange?: (value: number | null) => void;
};

/** Animated digit that highlights based on proximity to the tab. */
function AnimatedDigit({
  digit,
  rowIndex,
  tabY,
  primaryColor,
  secondaryColor,
}: {
  digit: number;
  rowIndex: number;
  tabY: Animated.SharedValue<number>;
  primaryColor: string;
  secondaryColor: string;
}) {
  const rowCenterY = rowIndex * ROW_HEIGHT;

  const animatedStyle = useAnimatedStyle(() => {
    const distance = Math.abs(tabY.value - rowCenterY) / ROW_HEIGHT;
    const scale = interpolate(distance, [0, 1, 10], [1.2, 1.0, 0.95]);
    const opacity =
      distance < 0.5
        ? 0
        : interpolate(distance, [0.5, 1, 3, 10], [0.7, 0.8, 0.5, 0.4]);
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const textColorStyle = useAnimatedStyle(() => {
    const distance = Math.abs(tabY.value - rowCenterY) / ROW_HEIGHT;
    const color = interpolateColor(
      distance,
      [0, 1],
      [primaryColor, secondaryColor]
    );
    return { color };
  });

  return (
    <Animated.View style={[styles.digitRow, animatedStyle]}>
      <Animated.Text style={[styles.digitText, textColorStyle]}>
        {digit}
      </Animated.Text>
    </Animated.View>
  );
}

/** Animated dash row — same logic as AnimatedDigit, row index 10. */
function AnimatedDash({
  tabY,
  secondaryColor,
}: {
  tabY: Animated.SharedValue<number>;
  secondaryColor: string;
}) {
  const rowCenterY = 10 * ROW_HEIGHT;

  const animatedStyle = useAnimatedStyle(() => {
    const distance = Math.abs(tabY.value - rowCenterY) / ROW_HEIGHT;
    const scale = interpolate(distance, [0, 1, 10], [1.2, 1.0, 0.95]);
    const opacity =
      distance < 0.5
        ? 0
        : interpolate(distance, [0.5, 1, 3, 10], [0.7, 0.8, 0.5, 0.4]);
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  return (
    <Animated.View style={[styles.digitRow, animatedStyle]}>
      <Animated.Text
        style={[styles.digitText, { color: secondaryColor, fontSize: 14 }]}
      >
        —
      </Animated.Text>
    </Animated.View>
  );
}

export function ScoreSlider({ side, value, onValueChange }: ScoreSliderProps) {
  const { theme } = useTheme();
  const [displayValue, setDisplayValue] = React.useState(
    value != null ? String(value) : "—"
  );

  // Tab Y shared value: 0 = top (value 9), MAX_Y = bottom (dash = no prediction)
  const tabY = useSharedValue(value != null ? valueToY(value) : MAX_Y);
  const dragStartY = useSharedValue(0);
  const isSyncingFromProp = useSharedValue(0);
  const isDraggingRef = React.useRef(false);
  const setIsDragging = React.useCallback((val: boolean) => {
    isDraggingRef.current = val;
  }, []);

  // Sync tabY when value prop changes (e.g., user swipes to new game)
  React.useEffect(() => {
    if (isDraggingRef.current) return;
    isSyncingFromProp.value = 1;
    const targetY = value != null ? valueToY(value) : MAX_Y;
    tabY.value = withTiming(targetY, { duration: 200 }, (finished) => {
      if (finished) isSyncingFromProp.value = 0;
    });
  }, [value]);

  useAnimatedReaction(
    () => Math.round(tabY.value / ROW_HEIGHT),
    (current, previous) => {
      if (previous !== null && current !== previous) {
        runOnJS(triggerHaptic)();
        if (isSyncingFromProp.value === 0) {
          const numVal = current >= 10 ? null : 9 - current;
          if (onValueChange) runOnJS(onValueChange)(numVal);
        }
      }
      const val = current >= 10 ? "—" : String(9 - current);
      runOnJS(setDisplayValue)(val);
    }
  );

  const panGesture = Gesture.Pan()
    .onStart(() => {
      runOnJS(setIsDragging)(true);
      dragStartY.value = tabY.value;
    })
    .onUpdate((event) => {
      const newY = dragStartY.value + event.translationY;
      tabY.value = Math.max(0, Math.min(MAX_Y, newY));
    })
    .onEnd(() => {
      const snapped = Math.round(tabY.value / ROW_HEIGHT) * ROW_HEIGHT;
      tabY.value = withSpring(
        snapped,
        { damping: 20, stiffness: 200 },
        (finished) => {
          if (finished) runOnJS(setIsDragging)(false);
        }
      );
    });

  // Tab position — centered vertically on the current digit row
  const tabStyle = useAnimatedStyle(() => ({
    top: tabY.value + (ROW_HEIGHT - TAB_HEIGHT) / 2,
  }));

  const tabColor = side === "home" ? "#22C55E" : "#3B82F6";
  const primaryColor = theme.colors.primary;
  const secondaryColor = theme.colors.textSecondary;

  return (
    <View
      style={[
        styles.container,
        side === "home" ? styles.containerLeft : styles.containerRight,
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.trackWrapper}>
        {/* Number track */}
        <View style={styles.track}>
          {DIGITS.map((digit, index) => (
            <AnimatedDigit
              key={digit}
              digit={digit}
              rowIndex={index}
              tabY={tabY}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
            />
          ))}
          <AnimatedDash tabY={tabY} secondaryColor={secondaryColor} />
        </View>
        {/* Tab — positions relative to trackWrapper, aligned with digits */}
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.tab,
              tabStyle,
              { backgroundColor: tabColor },
              side === "home" ? styles.tabLeft : styles.tabRight,
            ]}
          >
            <Text style={styles.tabValue}>{displayValue}</Text>
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: CONTAINER_WIDTH + TAB_WIDTH,
    justifyContent: "center",
    zIndex: 5,
  },
  containerLeft: {
    left: 0,
    alignItems: "flex-start",
  },
  containerRight: {
    right: 0,
    alignItems: "flex-end",
  },
  trackWrapper: {
    height: TRACK_HEIGHT + ROW_HEIGHT,
    position: "relative",
  },
  track: {
    width: CONTAINER_WIDTH,
    alignItems: "center",
  },
  digitRow: {
    height: ROW_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  digitText: {
    fontSize: 18,
    fontWeight: "600",
  },
  tab: {
    position: "absolute",
    width: TAB_WIDTH,
    height: TAB_HEIGHT,
    borderRadius: TAB_HEIGHT / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  tabValue: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
  tabLeft: {
    left: 0,
  },
  tabRight: {
    right: 0,
  },
});
