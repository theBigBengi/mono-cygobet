import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { TeamLogo } from "@/components/ui";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  runOnJS,
  withSpring,
  withTiming,
  interpolate,
  type SharedValue,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/lib/theme";
import { getContrastTextColor } from "../utils/color-helpers";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TRACK_PADDING = 0;
const TRACK_WIDTH = SCREEN_WIDTH - TRACK_PADDING * 2;
const CELL_WIDTH = TRACK_WIDTH / 11;
const THUMB_SIZE = 52;
const TRACK_HEIGHT = 48;
const MAX_X = 10 * CELL_WIDTH;

// Home: [logo] 0 1 ... 9 — null→0, digit d→(d+1)*CELL_WIDTH
// Away: 9 8 ... 0 [logo] — null→MAX_X, digit d→(9-d)*CELL_WIDTH
const valueToX = (value: number | null, reversed: boolean) =>
  reversed
    ? value == null
      ? MAX_X
      : (9 - value) * CELL_WIDTH
    : value == null
      ? 0
      : (value + 1) * CELL_WIDTH;

function triggerHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export type HorizontalScoreSliderProps = {
  side: "home" | "away";
  value?: number | null;
  onValueChange?: (value: number | null) => void;
  teamImagePath?: string | null;
  teamName?: string;
  /** Override default green/blue thumb color. */
  thumbColor?: string;
};

/** Animated digit — opacity/scale based on distance from thumb. */
function AnimatedDigit({
  digit,
  cellIndex,
  tabX,
  secondaryColor,
}: {
  digit: number;
  cellIndex: number;
  tabX: SharedValue<number>;
  secondaryColor: string;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const distance = Math.abs(tabX.value - cellIndex * CELL_WIDTH) / CELL_WIDTH;
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
    <Animated.View style={[styles.cell, animatedStyle]}>
      <Animated.Text style={[styles.digitText, { color: secondaryColor }]}>
        {digit}
      </Animated.Text>
    </Animated.View>
  );
}

/** Animated team logo — cellIndex 0 for home (left), 10 for away (right). */
function AnimatedTeamLogo({
  tabX,
  cellIndex,
  imagePath,
  teamName,
}: {
  tabX: SharedValue<number>;
  cellIndex: number;
  imagePath?: string | null;
  teamName?: string;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const distance = Math.abs(tabX.value - cellIndex * CELL_WIDTH) / CELL_WIDTH;
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
    <Animated.View style={[styles.cell, animatedStyle]}>
      <TeamLogo imagePath={imagePath} teamName={teamName ?? ""} size={32} />
    </Animated.View>
  );
}

export function HorizontalScoreSlider({
  side,
  value,
  onValueChange,
  teamImagePath,
  teamName,
  thumbColor,
}: HorizontalScoreSliderProps) {
  const { theme } = useTheme();
  const reversed = side === "away";
  const [displayValue, setDisplayValue] = React.useState<"logo" | string>(
    value == null ? "logo" : String(value)
  );

  const tabX = useSharedValue(valueToX(value ?? null, reversed));
  const dragStartX = useSharedValue(0);
  const isSyncingFromProp = useSharedValue(0);
  const isDraggingRef = React.useRef(false);
  const setIsDragging = React.useCallback((val: boolean) => {
    isDraggingRef.current = val;
  }, []);

  // Keep onValueChange in a ref so the worklet always calls the latest version
  const onValueChangeRef = React.useRef(onValueChange);
  onValueChangeRef.current = onValueChange;

  // Stable wrapper that reads from the ref - this is what the worklet will call
  const callOnValueChange = React.useCallback((val: number | null) => {
    if (onValueChangeRef.current) {
      onValueChangeRef.current(val);
    }
  }, []);

  React.useEffect(() => {
    if (isDraggingRef.current) return;
    isSyncingFromProp.value = 1;
    const targetX = valueToX(value ?? null, reversed);
    tabX.value = withTiming(targetX, { duration: 200 }, (finished) => {
      if (finished) isSyncingFromProp.value = 0;
    });
    // tabX and isSyncingFromProp are stable shared values (ref-like)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reversed]);

  useAnimatedReaction(
    () => Math.round(tabX.value / CELL_WIDTH),
    (current, previous) => {
      if (previous !== null && current !== previous) {
        runOnJS(triggerHaptic)();
        if (isSyncingFromProp.value === 0) {
          const numVal = reversed
            ? current === 10
              ? null
              : 9 - current
            : current === 0
              ? null
              : current - 1;
          runOnJS(callOnValueChange)(numVal);
        }
      }
      const display = reversed
        ? current === 10
          ? "logo"
          : String(9 - current)
        : current === 0
          ? "logo"
          : String(current - 1);
      runOnJS(setDisplayValue)(display);
    }
  );

  const panGesture = Gesture.Pan()
    .onStart(() => {
      isSyncingFromProp.value = 0; // reset so useAnimatedReaction can call onValueChange
      runOnJS(setIsDragging)(true);
      dragStartX.value = tabX.value;
    })
    .onUpdate((event) => {
      const newX = dragStartX.value + event.translationX;
      tabX.value = Math.max(0, Math.min(MAX_X, newX));
    })
    .onEnd(() => {
      // Reset isDragging immediately when finger lifts, not after spring animation.
      // This allows prop-driven animations (from other slider's auto-pair) to run.
      runOnJS(setIsDragging)(false);
      const snapped = Math.round(tabX.value / CELL_WIDTH) * CELL_WIDTH;
      tabX.value = withSpring(Math.max(0, Math.min(MAX_X, snapped)), {
        damping: 20,
        stiffness: 200,
      });
    });

  const thumbStyle = useAnimatedStyle(() => ({
    left: tabX.value + CELL_WIDTH / 2 - THUMB_SIZE / 2,
  }));

  const tabColor = thumbColor ?? (side === "home" ? "#22C55E" : "#3B82F6");
  const textColor = getContrastTextColor(tabColor);
  const secondaryColor = theme.colors.textSecondary;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.track}>
        {reversed ? (
          <>
            {[9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((digit) => (
              <AnimatedDigit
                key={digit}
                digit={digit}
                cellIndex={9 - digit}
                tabX={tabX}
                secondaryColor={secondaryColor}
              />
            ))}
            <AnimatedTeamLogo
              tabX={tabX}
              cellIndex={10}
              imagePath={teamImagePath}
              teamName={teamName}
            />
          </>
        ) : (
          <>
            <AnimatedTeamLogo
              tabX={tabX}
              cellIndex={0}
              imagePath={teamImagePath}
              teamName={teamName}
            />
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
              <AnimatedDigit
                key={digit}
                digit={digit}
                cellIndex={digit + 1}
                tabX={tabX}
                secondaryColor={secondaryColor}
              />
            ))}
          </>
        )}
      </View>
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.thumb,
            thumbStyle,
            {
              backgroundColor: tabColor,
            },
          ]}
        >
          {displayValue === "logo" ? (
            <TeamLogo
              imagePath={teamImagePath}
              teamName={teamName ?? ""}
              size={36}
            />
          ) : (
            <Text style={[styles.thumbValue, { color: textColor }]}>
              {displayValue}
            </Text>
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    marginHorizontal: TRACK_PADDING,
    marginVertical: 8,
    position: "relative",
    justifyContent: "center",
    overflow: "visible",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  track: {
    flexDirection: "row",
    alignItems: "center",
    height: "100%",
    width: TRACK_WIDTH,
    alignSelf: "center",
  },
  cell: {
    width: CELL_WIDTH,
    alignItems: "center",
    justifyContent: "center",
  },
  digitText: {
    fontSize: 16,
    fontWeight: "600",
  },
  thumb: {
    position: "absolute",
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    top: (TRACK_HEIGHT - THUMB_SIZE) / 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  thumbValue: {
    color: "white",
    fontSize: 18,
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
