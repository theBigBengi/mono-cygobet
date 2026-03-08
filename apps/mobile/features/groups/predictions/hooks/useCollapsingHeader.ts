import {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  clamp,
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
  const headerOffset = useSharedValue(0);

  const animatedScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
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
