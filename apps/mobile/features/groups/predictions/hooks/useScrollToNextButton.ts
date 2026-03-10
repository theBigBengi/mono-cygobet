import React, { useCallback } from "react";
import {
  useSharedValue,
  useAnimatedReaction,
  withTiming,
  runOnJS,
  type SharedValue,
} from "react-native-reanimated";
import { Dimensions, type View } from "react-native";
import * as Haptics from "expo-haptics";
import { HEADER_HEIGHT } from "../utils/constants";

type UseScrollToNextButtonOpts = {
  nextToPredictId: number | null;
  isReady: boolean;
  matchCardRefs: React.MutableRefObject<Record<string, React.RefObject<View>>>;
  scrollY: SharedValue<number>;
  headerOffset: SharedValue<number>;
  insetTop: number;
  scrollToMatchCard: (fixtureId: number) => void;
};

export function useScrollToNextButton({
  nextToPredictId,
  isReady,
  matchCardRefs,
  scrollY,
  headerOffset,
  insetTop,
  scrollToMatchCard,
}: UseScrollToNextButtonOpts) {
  const VIEWPORT_H = Dimensions.get("window").height;
  const nextCardY = useSharedValue(-1);
  const [scrollBtnDir, setScrollBtnDir] = React.useState<
    "up" | "down" | null
  >(null);

  // Measure the next-to-predict card position after layout
  React.useEffect(() => {
    if (!nextToPredictId || !isReady) {
      nextCardY.value = -1;
      setScrollBtnDir(null);
      return;
    }

    let measured = false;

    const tryMeasure = (): boolean => {
      const cardRef = matchCardRefs.current[String(nextToPredictId)];
      if (!cardRef?.current) return false;
      cardRef.current.measureInWindow((_x: number, screenY: number) => {
        if (screenY != null) {
          measured = true;
          nextCardY.value = screenY + scrollY.value;
        }
      });
      return true;
    };

    // Initial attempt after layout settles
    const timer = setTimeout(() => {
      if (!tryMeasure()) {
        // Card not rendered yet (beyond FlatList window) — assume far below viewport
        nextCardY.value = 99999;
      }
    }, 400);

    // Retry until the card is actually measured (renders when user scrolls near it)
    let attempts = 0;
    const retryInterval = setInterval(() => {
      if (measured || attempts++ >= 15) {
        clearInterval(retryInterval);
        return;
      }
      tryMeasure();
    }, 800);

    return () => {
      clearTimeout(timer);
      clearInterval(retryInterval);
    };
  }, [nextToPredictId, isReady, matchCardRefs, scrollY, nextCardY]);

  const prevBtnDir = useSharedValue(0);

  useAnimatedReaction(
    () => ({ scroll: scrollY.value, cardY: nextCardY.value }),
    ({ scroll, cardY }) => {
      let nextDir = 0;
      if (cardY >= 0) {
        const CARD_H = 140;
        const viewportTop = scroll + HEADER_HEIGHT + insetTop;
        const viewportBottom = scroll + VIEWPORT_H;
        if (cardY + CARD_H < viewportTop) {
          nextDir = 1;
        } else if (cardY > viewportBottom) {
          nextDir = 2;
        }
      }
      if (nextDir !== prevBtnDir.value) {
        prevBtnDir.value = nextDir;
        runOnJS(setScrollBtnDir)(
          nextDir === 0 ? null : nextDir === 1 ? "up" : "down"
        );
      }
    }
  );

  const handleScrollToNext = useCallback(() => {
    if (nextToPredictId) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (headerOffset.value < 0) {
        headerOffset.value = withTiming(0, { duration: 200 });
      }
      scrollToMatchCard(nextToPredictId);
    }
  }, [nextToPredictId, scrollToMatchCard, headerOffset]);

  return { scrollBtnDir, handleScrollToNext };
}
