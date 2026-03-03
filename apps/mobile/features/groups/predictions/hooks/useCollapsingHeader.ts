import {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  clamp,
  withTiming,
} from "react-native-reanimated";

type UseCollapsingHeaderOpts = {
  totalHeaderHeight: number;
  headerHeight: number;
};

export function useCollapsingHeader({
  totalHeaderHeight,
  headerHeight,
}: UseCollapsingHeaderOpts) {
  const scrollY = useSharedValue(0);
  const previousScrollY = useSharedValue(0);
  const headerOffset = useSharedValue(0);
  const isUserDragging = useSharedValue(false);

  const animatedScrollHandler = useAnimatedScrollHandler({
    onBeginDrag: () => {
      isUserDragging.value = true;
    },
    onScroll: (event) => {
      const currentY = event.contentOffset.y;
      const maxScrollY =
        event.contentSize.height - event.layoutMeasurement.height;

      scrollY.value = currentY;

      const delta = previousScrollY.value - currentY;
      if (isUserDragging.value) {
        headerOffset.value = clamp(
          headerOffset.value + delta,
          -totalHeaderHeight,
          0
        );
      }

      previousScrollY.value = clamp(currentY, 0, maxScrollY);
    },
    onMomentumEnd: () => {
      isUserDragging.value = false;

      if (headerOffset.value > -totalHeaderHeight / 2) {
        headerOffset.value = withTiming(0, { duration: 200 });
      } else {
        headerOffset.value = withTiming(-totalHeaderHeight, { duration: 200 });
      }
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerOffset.value }],
  }));

  const scrollBtnAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: clamp(headerOffset.value, -headerHeight, 0),
      },
    ],
  }));

  return {
    scrollY,
    headerOffset,
    animatedScrollHandler,
    headerAnimatedStyle,
    scrollBtnAnimatedStyle,
  };
}
