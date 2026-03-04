import React, {
  useState,
  useCallback,
  useRef,
  useImperativeHandle,
  forwardRef,
  useMemo,
} from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, { useSharedValue } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { canPredict } from "@repo/utils";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useGroupQuery } from "@/domains/groups";
import { useGroupPredictions } from "../hooks/useGroupPredictions";
import { useVerticalPager } from "../hooks/useVerticalPager";
import { PeekCard } from "./PeekCard";
import { PredictAllCardSkeleton } from "./PredictAllCardSkeleton";
import { getCardLayout, CARD_GAP } from "../utils/peekCardLayout";
import type { PredictionMode } from "../types";
import type { FixtureItem } from "@/types/common";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

export type GroupPageRef = {
  saveAllPending: () => Promise<void>;
};

type GroupPageProps = {
  groupId: number;
  predictionMode: PredictionMode;
  isCurrent: boolean;
  headerHeight: number;
};

export const GroupPage = forwardRef<GroupPageRef, GroupPageProps>(
  function GroupPage({ groupId, predictionMode, isCurrent, headerHeight }, ref) {
    const { theme } = useTheme();
    const { t } = useTranslation("common");

    const { data: groupData, isLoading: isGroupLoading } = useGroupQuery(
      groupId,
      { includeFixtures: true }
    );
    const fixtures = useMemo<FixtureItem[]>(() => {
      const list = groupData?.data?.fixtures;
      return Array.isArray(list) ? (list as FixtureItem[]) : [];
    }, [groupData?.data?.fixtures]);

    const predictableFixtures = useMemo(
      () => fixtures.filter((f) => canPredict(f.state, f.startTs)),
      [fixtures]
    );

    const {
      getPrediction,
      isPredictionSaved,
      updatePrediction,
      updateSliderValue,
      saveAllPending,
    } = useGroupPredictions({ groupId, predictionMode });

    const saveAllPendingRef = useRef(saveAllPending);
    saveAllPendingRef.current = saveAllPending;

    useImperativeHandle(
      ref,
      () => ({
        saveAllPending: () => saveAllPendingRef.current(),
      }),
      []
    );

    const savePending = useCallback(() => {
      saveAllPendingRef.current();
    }, []);

    // Stable callbacks — identity never changes
    const updatePredictionRef = useRef(updatePrediction);
    updatePredictionRef.current = updatePrediction;
    const updateSliderValueRef = useRef(updateSliderValue);
    updateSliderValueRef.current = updateSliderValue;

    const stableUpdatePrediction = useCallback(
      (fixtureId: number, type: "home" | "away", value: string) => {
        updatePredictionRef.current(fixtureId, type, value);
      },
      []
    );
    const stableUpdateSliderValue = useCallback(
      (fixtureId: number, side: "home" | "away", val: number | null) => {
        updateSliderValueRef.current(fixtureId, side, val);
      },
      []
    );

    const CONTENT_TOP = headerHeight;
    const { CARD_HEIGHT, STEP, EXPAND_AMOUNT } = getCardLayout(SCREEN_HEIGHT);
    const SWIPE_THRESHOLD = SCREEN_HEIGHT * 0.65;

    const [currentIndex, setCurrentIndex] = useState(0);
    const currentIndexSV = useSharedValue(0);
    const translateY = useSharedValue(0);
    const expandProgress = useSharedValue(0);

    const totalCards = predictableFixtures.length;

    const onIndexChange = useCallback((index: number) => {
      setCurrentIndex(index);
    }, []);

    const { panGesture, stripStyle } = useVerticalPager({
      totalCards,
      expandProgress,
      currentIndexSV,
      translateY,
      step: STEP,
      swipeThreshold: SWIPE_THRESHOLD,
      onSavePending: savePending,
      onIndexChange,
    });

    if (isGroupLoading || fixtures.length === 0) {
      return (
        <View style={styles.pageContainer}>
          <PredictAllCardSkeleton
            cardHeight={CARD_HEIGHT}
            contentTop={CONTENT_TOP}
          />
        </View>
      );
    }

    if (predictableFixtures.length === 0) {
      return (
        <View
          style={[
            styles.pageContainer,
            { justifyContent: "center", alignItems: "center" },
          ]}
        >
          <AppText variant="body" color="secondary">
            {t("groups.noGroupsInFilter")}
          </AppText>
        </View>
      );
    }

    return (
      <View
        style={styles.pageContainer}
        pointerEvents={isCurrent ? "auto" : "none"}
      >
        <View style={StyleSheet.absoluteFill}>
          <GestureDetector gesture={panGesture}>
            <Animated.View style={stripStyle}>
              {predictableFixtures.map((f, i) => {
                const isNearby = Math.abs(currentIndex - i) <= 1;
                if (!isNearby) {
                  return (
                    <View
                      key={f.id}
                      style={{
                        height: CARD_HEIGHT,
                        marginBottom: CARD_GAP,
                      }}
                    />
                  );
                }

                return (
                  <PeekCard
                    key={f.id}
                    fixture={f}
                    index={i}
                    cardHeight={CARD_HEIGHT}
                    expandAmount={EXPAND_AMOUNT}
                    contentTop={CONTENT_TOP}
                    step={STEP}
                    cardBackground={theme.colors.cardBackground}
                    currentIndexSV={currentIndexSV}
                    translateY={translateY}
                    expandProgress={expandProgress}
                    prediction={getPrediction(f.id)}
                    isSaved={isPredictionSaved(f.id)}
                    onUpdatePrediction={stableUpdatePrediction}
                    onUpdateSliderValue={stableUpdateSliderValue}
                    isInteractive={isCurrent && currentIndex === i}
                    totalCards={predictableFixtures.length}
                  />
                );
              })}
            </Animated.View>
          </GestureDetector>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  pageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
});
