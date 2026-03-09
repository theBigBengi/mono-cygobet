import { Dimensions } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import {
  useAnimatedStyle,
  useSharedValue,
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
  // Only the middle 60% of the screen activates the pager swipe.
  const LEFT_BOUND = SCREEN_WIDTH * 0.20;
  const RIGHT_BOUND = SCREEN_WIDTH * 0.80;

  // Track touch start for manual direction disambiguation
  const startAbsX = useSharedValue(0);
  const startAbsY = useSharedValue(0);
  const decided = useSharedValue(false);

  const panGesture = Gesture.Pan()
    .manualActivation(true)
    .onTouchesDown((e, stateManager) => {
      const touch = e.allTouches[0];
      if (!touch) return;
      // Fail immediately if touch is in the slider zone
      if (touch.x <= LEFT_BOUND || touch.x >= RIGHT_BOUND) {
        stateManager.fail();
        return;
      }
      startAbsX.value = touch.absoluteX;
      startAbsY.value = touch.absoluteY;
      decided.value = false;
    })
    .onTouchesMove((e, stateManager) => {
      if (decided.value) return;
      const touch = e.allTouches[0];
      if (!touch) return;
      const dx = Math.abs(touch.absoluteX - startAbsX.value);
      const dy = Math.abs(touch.absoluteY - startAbsY.value);
      // Wait for enough movement to determine direction
      if (dx < 10 && dy < 10) return;
      decided.value = true;
      if (dy > dx) {
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
