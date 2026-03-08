// DEBUG SCREEN — Swipeable card stack as a vertical pager.
// Cards sit in a vertical strip. Dragging moves the whole strip.
// The "peek" is the top edge of the next card visible at the bottom.
// Tap a card to expand it fullscreen; tap again to collapse.

import React, { useState } from "react";
import { View, StyleSheet, Dimensions, Text, Pressable } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SWIPE_THRESHOLD = SCREEN_HEIGHT * 0.65;
const CARD_GAP = 12;
const PEEK = 60;

export function DebugSwipeCardScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const CARDS = [theme.colors.danger, theme.colors.live, theme.colors.success];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const TOP_PAD = insets.top + 12;
  const VISIBLE_HEIGHT = SCREEN_HEIGHT - TOP_PAD;
  const CARD_HEIGHT = VISIBLE_HEIGHT - PEEK - CARD_GAP;
  const STEP = CARD_HEIGHT + CARD_GAP;

  const currentIndexSV = useSharedValue(0);
  const translateY = useSharedValue(0);
  const expandAnim = useSharedValue(0); // 0 = collapsed, 1 = expanded

  const toggleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    expandAnim.value = withTiming(next ? 1 : 0, { duration: 300 });
  };

  const panGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .failOffsetX([-20, 20])
    .enabled(!expanded)
    .onUpdate((e) => {
      const idx = currentIndexSV.value;
      // Rubber-band resistance at edges
      if ((idx === 0 && e.translationY > 0) || (idx === CARDS.length - 1 && e.translationY < 0)) {
        translateY.value = e.translationY * 0.25;
      } else {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      const idx = currentIndexSV.value;
      const flingUp =
        (e.translationY < -SWIPE_THRESHOLD || e.velocityY < -500) &&
        idx < CARDS.length - 1;
      const flingDown =
        (e.translationY > SWIPE_THRESHOLD || e.velocityY > 500) &&
        idx > 0;

      if (flingUp) {
        translateY.value = withTiming(-STEP, { duration: 300 }, () => {
          currentIndexSV.value += 1;
          translateY.value = 0;
          runOnJS(setCurrentIndex)(currentIndexSV.value);
        });
      } else if (flingDown) {
        translateY.value = withTiming(STEP, { duration: 300 }, () => {
          currentIndexSV.value -= 1;
          translateY.value = 0;
          runOnJS(setCurrentIndex)(currentIndexSV.value);
        });
      } else {
        translateY.value = withSpring(0, { damping: 50, stiffness: 600 });
      }
    });

  const stripStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -(currentIndexSV.value * STEP) + translateY.value },
    ],
  }));

  const viewportStyle = useAnimatedStyle(() => ({
    top: interpolate(expandAnim.value, [0, 1], [TOP_PAD, 0]),
  }));

  const cardAnimStyle = (index: number) =>
    useAnimatedStyle(() => {
      const isCurrent = currentIndexSV.value === index;
      if (!isCurrent) return {};
      return {
        height: interpolate(
          expandAnim.value,
          [0, 1],
          [CARD_HEIGHT, SCREEN_HEIGHT]
        ),
        marginBottom: interpolate(expandAnim.value, [0, 1], [CARD_GAP, 0]),
        marginHorizontal: interpolate(expandAnim.value, [0, 1], [12, 0]),
        borderRadius: interpolate(expandAnim.value, [0, 1], [16, 0]),
      };
    });

  return (
    <GestureHandlerRootView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Animated.View style={[styles.viewport, viewportStyle]}>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={stripStyle}>
            {CARDS.map((color, i) => (
              <Pressable key={i} onPress={i === currentIndex ? toggleExpand : undefined}>
                <Animated.View
                  style={[
                    styles.card,
                    {
                      height: CARD_HEIGHT,
                      marginBottom: CARD_GAP,
                      backgroundColor: color,
                    },
                    cardAnimStyle(i),
                  ]}
                >
                  <Text style={[styles.cardLabel, { color: theme.colors.textInverse }]}>{i + 1}</Text>
                </Animated.View>
              </Pressable>
            ))}
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  viewport: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  card: {
    marginHorizontal: 12,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cardLabel: {
    fontSize: 32,
    fontWeight: "800",
    opacity: 0.5,
  },
});
