import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Gesture, GestureDetector, type GestureType } from "react-native-gesture-handler";
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

const CELL_HEIGHT = 44;
const STRIP_WIDTH = 40;
const THUMB_WIDTH = 66;
const THUMB_HEIGHT = 52;
// 11 cells: digits 9..0 (yIndex 0–9) + logo (yIndex 10)
const MAX_Y = 10 * CELL_HEIGHT;

/**
 * Digit 9 at top (yIndex 0), digit 0 (yIndex 9), team logo at bottom (yIndex 10).
 * null → logo position (yIndex 10).
 */
const valueToY = (value: number | null) =>
  value == null ? 10 * CELL_HEIGHT : (9 - value) * CELL_HEIGHT;

function triggerHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** Animated digit — opacity/scale based on distance from thumb. */
function AnimatedDigit({
  digit,
  yIndex,
  tabY,
  secondaryColor,
  side,
}: {
  digit: number;
  yIndex: number;
  tabY: SharedValue<number>;
  secondaryColor: string;
  side?: "left" | "right";
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const distance =
      Math.abs(tabY.value - yIndex * CELL_HEIGHT) / CELL_HEIGHT;
    const scale = interpolate(distance, [0, 1, 10], [1.2, 1.0, 0.95]);
    const opacity =
      distance < 0.5
        ? 0
        : interpolate(distance, [0.5, 1, 3, 10], [0.7, 0.8, 0.5, 0.4]);
    return { opacity, transform: [{ scale }] };
  });

  return (
    <Animated.View style={[styles.cell, animatedStyle]}>
      <Animated.Text style={[styles.digitText, { color: secondaryColor }]}>
        {digit}
      </Animated.Text>
    </Animated.View>
  );
}

/** Animated dash cell — the null/undefined position at the bottom. */
function AnimatedDashCell({
  yIndex,
  tabY,
  secondaryColor,
  side,
}: {
  yIndex: number;
  tabY: SharedValue<number>;
  secondaryColor: string;
  side?: "left" | "right";
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const distance =
      Math.abs(tabY.value - yIndex * CELL_HEIGHT) / CELL_HEIGHT;
    const scale = interpolate(distance, [0, 1, 10], [1.2, 1.0, 0.95]);
    const opacity =
      distance < 0.5
        ? 0
        : interpolate(distance, [0.5, 1, 3, 10], [0.7, 0.8, 0.5, 0.4]);
    return { opacity, transform: [{ scale }] };
  });

  return (
    <Animated.View style={[styles.cell, animatedStyle]}>
      <Animated.Text style={[styles.digitText, { color: secondaryColor }]}>
        —
      </Animated.Text>
    </Animated.View>
  );
}

export type VerticalScoreSliderProps = {
  value: number | null;
  onValueChange?: (value: number | null) => void;
  thumbColor: string;
  /** Which side the slider sits on — shifts thumb to pop out towards card center */
  side?: "left" | "right";
  onDragStart?: () => void;
  onDragEnd?: () => void;
  /** Ref to the pager gesture — slider blocks it when touched */
  pagerGestureRef?: React.MutableRefObject<GestureType | undefined>;
};

/**
 * Vertical draggable score slider (0–9 + team logo).
 * Mirrors the HorizontalScoreSlider logic but on the Y axis.
 * Digit 9 at top, 0 at bottom, team logo below 0 (null state).
 */
export const VerticalScoreSlider = React.memo(function VerticalScoreSlider({
  value,
  onValueChange,
  thumbColor,
  side,
  onDragStart,
  onDragEnd,
  pagerGestureRef,
}: VerticalScoreSliderProps) {
  const { theme } = useTheme();

  const tabY = useSharedValue(valueToY(value ?? null));
  const dragStartY = useSharedValue(0);
  const isSyncingFromProp = useSharedValue(0);
  const isDraggingRef = React.useRef(false);
  const setIsDragging = React.useCallback((val: boolean) => {
    isDraggingRef.current = val;
  }, []);

  const onValueChangeRef = React.useRef(onValueChange);
  onValueChangeRef.current = onValueChange;

  const callOnValueChange = React.useCallback((val: number | null) => {
    if (onValueChangeRef.current) {
      onValueChangeRef.current(val);
    }
  }, []);

  // Sync from prop (e.g. text input changes the value)
  React.useEffect(() => {
    if (isDraggingRef.current) return;
    isSyncingFromProp.value = 1;
    const targetY = valueToY(value ?? null);
    tabY.value = withTiming(targetY, { duration: 200 }, (finished) => {
      if (finished) isSyncingFromProp.value = 0;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const [displayValue, setDisplayValue] = React.useState<string>(
    value == null ? "logo" : String(value)
  );

  // React to thumb position changes → haptics + callback + display
  useAnimatedReaction(
    () => Math.round(tabY.value / CELL_HEIGHT),
    (currentIndex, previousIndex) => {
      // Display update: yIndex 0–9 = digits 9–0, yIndex 10 = logo (null)
      if (currentIndex === 10) {
        runOnJS(setDisplayValue)("logo");
      } else {
        const digit = 9 - currentIndex;
        runOnJS(setDisplayValue)(
          digit >= 0 && digit <= 9 ? String(digit) : "logo"
        );
      }

      // Value change + haptics
      if (previousIndex !== null && currentIndex !== previousIndex) {
        runOnJS(triggerHaptic)();
        if (isSyncingFromProp.value === 0) {
          if (currentIndex === 10) {
            runOnJS(callOnValueChange)(null);
          } else {
            const numVal = 9 - currentIndex;
            runOnJS(callOnValueChange)(
              numVal >= 0 && numVal <= 9 ? numVal : null
            );
          }
        }
      }
    }
  );

  // Touch anywhere on the strip + thumb to jump + drag
  const panGesture = (() => {
    const g = Gesture.Pan().minDistance(0);
    if (pagerGestureRef) g.blocksExternalGesture(pagerGestureRef);
    return g;
  })()
    .onStart((e) => {
      isSyncingFromProp.value = 0;
      runOnJS(setIsDragging)(true);
      if (onDragStart) runOnJS(onDragStart)();
      // Jump thumb to touch position immediately
      const touchY = Math.max(0, Math.min(MAX_Y, e.y));
      tabY.value = touchY;
      dragStartY.value = touchY;
    })
    .onUpdate((event) => {
      const newY = dragStartY.value + event.translationY;
      tabY.value = Math.max(0, Math.min(MAX_Y, newY));
    })
    .onEnd(() => {
      runOnJS(setIsDragging)(false);
      if (onDragEnd) runOnJS(onDragEnd)();
      const snapped = Math.round(tabY.value / CELL_HEIGHT) * CELL_HEIGHT;
      tabY.value = withSpring(Math.max(0, Math.min(MAX_Y, snapped)), {
        damping: 20,
        stiffness: 200,
      });
    });

  const thumbStyle = useAnimatedStyle(() => {
    const rawTop = tabY.value + CELL_HEIGHT / 2 - THUMB_HEIGHT / 2;
    const maxTop = 11 * CELL_HEIGHT - THUMB_HEIGHT;
    return {
      top: Math.max(0, Math.min(rawTop, maxTop)),
    };
  });

  const textColor = getContrastTextColor(thumbColor);
  const secondaryColor = theme.colors.textSecondary;
  const isLogo = displayValue === "logo";

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.container,
          side && {
            width: THUMB_WIDTH,
            alignItems: side === "right" ? "flex-start" : "flex-end",
          },
        ]}
      >
        {/* Digit track + logo cell */}
        <View style={styles.track} pointerEvents="none">
          {[9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((digit) => (
            <AnimatedDigit
              key={digit}
              digit={digit}
              yIndex={9 - digit}
              tabY={tabY}
              secondaryColor={secondaryColor}
              side={side}
            />
          ))}
          {/* Dash cell at bottom (yIndex 10) — null/undefined state */}
          <AnimatedDashCell
            yIndex={10}
            tabY={tabY}
            secondaryColor={secondaryColor}
            side={side}
          />
        </View>

        {/* Thumb indicator — wider than strip, pops out on sides */}
        <Animated.View
          style={[
            styles.thumb,
            thumbStyle,
            {
              backgroundColor: thumbColor,
              left: 0,
              ...(side === "left"
                ? { borderTopLeftRadius: THUMB_HEIGHT / 2, borderBottomLeftRadius: THUMB_HEIGHT / 2, borderTopRightRadius: 0, borderBottomRightRadius: 0, paddingLeft: THUMB_WIDTH - STRIP_WIDTH }
                : side === "right"
                  ? { borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderTopRightRadius: THUMB_HEIGHT / 2, borderBottomRightRadius: THUMB_HEIGHT / 2, paddingRight: THUMB_WIDTH - STRIP_WIDTH }
                  : { borderRadius: THUMB_HEIGHT / 2 }),
            },
          ]}
          pointerEvents="none"
        >
          {isLogo ? (
            <Text style={[styles.thumbValue, { color: textColor }]}>—</Text>
          ) : (
            <Text style={[styles.thumbValue, { color: textColor }]}>
              {displayValue}
            </Text>
          )}
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  container: {
    width: STRIP_WIDTH,
    height: 11 * CELL_HEIGHT,
    position: "relative",
    alignItems: "center",
    overflow: "visible",
  },
  track: {
    flexDirection: "column",
    alignItems: "center",
    height: "100%",
    width: STRIP_WIDTH,
  },
  cell: {
    height: CELL_HEIGHT,
    width: STRIP_WIDTH,
    alignItems: "center",
    justifyContent: "center",
  },
  digitText: {
    fontSize: 15,
    fontWeight: "600",
  },
  thumb: {
    position: "absolute",
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    borderRadius: 0,
    alignItems: "center",
    justifyContent: "center",
    left: (STRIP_WIDTH - THUMB_WIDTH) / 2,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)",
  },
  thumbValue: {
    fontSize: 20,
    fontWeight: "800",
  },
});
