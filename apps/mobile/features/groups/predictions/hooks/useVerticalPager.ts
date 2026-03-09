import { Dimensions } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import {
  useAnimatedStyle,
  withTiming,
  runOnJS,
  type SharedValue,
} from "react-native-reanimated";

const SCREEN_WIDTH = Dimensions.get("window").width;

type VerticalPagerOpts = {
  totalCards: number;
  expandProgress: SharedValue<number>;
  currentIndexSV: SharedValue<number>;
  translateY: SharedValue<number>;
  step: number;
  swipeThreshold: number;
  onSavePending: () => void;
  onIndexChange: (index: number) => void;
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
}: VerticalPagerOpts) {
  // Only the middle 30% of the screen activates the pager swipe.
  // Sliders live on the edges, so touches there won't trigger card swiping.
  const LEFT_BOUND = SCREEN_WIDTH * 0.20;
  const RIGHT_BOUND = SCREEN_WIDTH * 0.80;

  const panGesture = Gesture.Pan()
    .manualActivation(true)
    .onTouchesMove((e, stateManager) => {
      const x = e.allTouches[0]?.x ?? 0;
      if (x > LEFT_BOUND && x < RIGHT_BOUND) {
        stateManager.activate();
      } else {
        stateManager.fail();
      }
    })
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
