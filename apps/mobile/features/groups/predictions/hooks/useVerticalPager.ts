import type React from "react";
import { Gesture, type GestureType } from "react-native-gesture-handler";
import {
  useAnimatedStyle,
  withTiming,
  runOnJS,
  type SharedValue,
} from "react-native-reanimated";

type VerticalPagerOpts = {
  totalCards: number;
  expandProgress: SharedValue<number>;
  currentIndexSV: SharedValue<number>;
  translateY: SharedValue<number>;
  step: number;
  swipeThreshold: number;
  onSavePending: () => void;
  onIndexChange: (index: number) => void;
  pagerGestureRef: React.MutableRefObject<GestureType | undefined>;
};

export function useVerticalPager({
  totalCards,
  expandProgress,
  currentIndexSV,
  translateY,
  step,
  swipeThreshold,
  onSavePending,
  onIndexChange,
  pagerGestureRef,
}: VerticalPagerOpts) {
  const panGesture = Gesture.Pan()
    .withRef(pagerGestureRef)
    .activeOffsetY([-10, 10])
    .failOffsetX([-20, 20])
    .onUpdate((e) => {
      if (expandProgress.value > 0) return;
      const idx = currentIndexSV.value;
      if (
        (idx === 0 && e.translationY > 0) ||
        (idx === totalCards - 1 && e.translationY < 0)
      ) {
        translateY.value = e.translationY * 0.25;
      } else {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (expandProgress.value > 0) return;
      const idx = currentIndexSV.value;
      const flingUp =
        (e.translationY < -swipeThreshold || e.velocityY < -500) &&
        idx < totalCards - 1;
      const flingDown =
        (e.translationY > swipeThreshold || e.velocityY > 500) && idx > 0;

      if (flingUp) {
        expandProgress.value = 0;
        runOnJS(onSavePending)();
        translateY.value = withTiming(-step, { duration: 300 }, () => {
          currentIndexSV.value += 1;
          translateY.value = 0;
          runOnJS(onIndexChange)(currentIndexSV.value);
        });
      } else if (flingDown) {
        expandProgress.value = 0;
        runOnJS(onSavePending)();
        translateY.value = withTiming(step, { duration: 300 }, () => {
          currentIndexSV.value -= 1;
          translateY.value = 0;
          runOnJS(onIndexChange)(currentIndexSV.value);
        });
      } else {
        translateY.value = withTiming(0, { duration: 250 });
      }
    });

  const stripStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -(currentIndexSV.value * step) + translateY.value },
    ],
  }));

  return { panGesture, stripStyle };
}
