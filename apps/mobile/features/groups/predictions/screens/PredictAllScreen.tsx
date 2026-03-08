import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { View, StyleSheet, Dimensions, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  interpolate,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { groupsKeys, fetchGroupById } from "@/domains/groups";
import { usePredictableGroups } from "../hooks/usePredictableGroups";
import { GroupPage, type GroupPageRef } from "../components/GroupPage";
import { GroupPageIndicator } from "../components/GroupPageIndicator";
import type { PredictionMode } from "../types";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const PAGE_GAP = 24;
const PAGE_STEP = SCREEN_WIDTH + PAGE_GAP;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

export function PredictAllScreen() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const queryClient = useQueryClient();
  const { groups, isLoading } = usePredictableGroups();

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexSV = useSharedValue(0);
  const translateX = useSharedValue(0);

  const groupRefs = useRef<Map<number, GroupPageRef>>(new Map());

  const totalGroups = groups.length;

  const HEADER_HEIGHT = insets.top + 36 + 4;

  const groupNames = useMemo(
    () => groups.map((g) => g.name),
    [groups]
  );

  const saveCurrentGroup = useCallback(() => {
    const group = groups[currentIndexSV.value];
    if (group) {
      groupRefs.current.get(group.id)?.saveAllPending();
    }
  }, [groups]);

  useEffect(() => {
    return () => {
      groupRefs.current.forEach((ref) => ref.saveAllPending());
    };
  }, []);

  useEffect(() => {
    if (!isLoading && groups.length === 0) {
      router.back();
    }
  }, [isLoading, groups.length, router]);

  // Prefetch next group's data for instant swipe
  useEffect(() => {
    const nextIdx = currentIndex + 1;
    if (nextIdx < totalGroups) {
      const nextGroup = groups[nextIdx];
      queryClient.prefetchQuery({
        queryKey: groupsKeys.detail(nextGroup.id, true),
        queryFn: () => fetchGroupById(nextGroup.id, { include: "fixtures" }),
        meta: { scope: "user" },
      });
    }
  }, [currentIndex, totalGroups, groups, queryClient]);

  const onIndexChange = useCallback(
    (index: number) => {
      setCurrentIndex(index);
    },
    []
  );

  const horizontalPan = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-20, 20])
    .onUpdate((e) => {
      const idx = currentIndexSV.value;
      if (
        (idx === 0 && e.translationX > 0) ||
        (idx === totalGroups - 1 && e.translationX < 0)
      ) {
        translateX.value = e.translationX * 0.25;
      } else {
        translateX.value = e.translationX;
      }
    })
    .onEnd((e) => {
      const idx = currentIndexSV.value;
      const flingLeft =
        (e.translationX < -SWIPE_THRESHOLD || e.velocityX < -500) &&
        idx < totalGroups - 1;
      const flingRight =
        (e.translationX > SWIPE_THRESHOLD || e.velocityX > 500) && idx > 0;

      if (flingLeft) {
        runOnJS(saveCurrentGroup)();
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
        translateX.value = withTiming(-PAGE_STEP, { duration: 300 }, () => {
          currentIndexSV.value += 1;
          translateX.value = 0;
          runOnJS(onIndexChange)(currentIndexSV.value);
        });
      } else if (flingRight) {
        runOnJS(saveCurrentGroup)();
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
        translateX.value = withTiming(PAGE_STEP, { duration: 300 }, () => {
          currentIndexSV.value -= 1;
          translateX.value = 0;
          runOnJS(onIndexChange)(currentIndexSV.value);
        });
      } else {
        translateX.value = withTiming(0, { duration: 250 });
      }
    });

  const stripStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX:
          -(currentIndexSV.value * PAGE_STEP) + translateX.value,
      },
    ],
  }));

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  if (isLoading) {
    return <QueryLoadingView message={t("groups.predictAllLoading")} />;
  }

  if (groups.length === 0) {
    return null;
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: theme.colors.textPrimary + "0F" },
        ]}
      />

      <View style={styles.viewport}>
        <GestureDetector gesture={horizontalPan}>
          <Animated.View
            style={[
              {
                flexDirection: "row",
                width: totalGroups * PAGE_STEP,
                height: SCREEN_HEIGHT,
              },
              stripStyle,
            ]}
          >
            {groups.map((group, i) => {
              const isNearby = Math.abs(currentIndex - i) <= 1;
              if (!isNearby) {
                return (
                  <View
                    key={group.id}
                    style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, marginEnd: PAGE_GAP }}
                  />
                );
              }

              const predictionMode =
                (group.predictionMode as PredictionMode) ?? "CorrectScore";

              return (
                <PageWrapper
                  key={group.id}
                  index={i}
                  translateX={translateX}
                  currentIndexSV={currentIndexSV}
                >
                  <GroupPage
                    ref={(r) => {
                      if (r) {
                        groupRefs.current.set(group.id, r);
                      } else {
                        groupRefs.current.delete(group.id);
                      }
                    }}
                    groupId={group.id}
                    predictionMode={predictionMode}
                    isCurrent={currentIndex === i}
                    headerHeight={HEADER_HEIGHT + 40}
                  />
                </PageWrapper>
              );
            })}
          </Animated.View>
        </GestureDetector>
      </View>

      <View
        style={[styles.screenHeader, { paddingTop: insets.top }]}
      >
        <Pressable
          onPress={handleBack}
          hitSlop={12}
          style={styles.screenHeaderBack}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={theme.colors.textPrimary}
          />
        </Pressable>
        <View style={styles.headerCenter}>
          <GroupPageIndicator
            groupNames={groupNames}
            totalGroups={totalGroups}
            translateX={translateX}
            currentIndexSV={currentIndexSV}
            currentIndex={currentIndex}
            pageStep={PAGE_STEP}
          />
        </View>
        <View style={styles.screenHeaderBack} />
      </View>
    </View>
  );
}

/** Clips the page, adds gap, and fades during horizontal swipe */
function PageWrapper({
  index,
  translateX,
  currentIndexSV,
  children,
}: {
  index: number;
  translateX: SharedValue<number>;
  currentIndexSV: SharedValue<number>;
  children: React.ReactNode;
}) {
  const fadeStyle = useAnimatedStyle(() => {
    const progress = currentIndexSV.value - translateX.value / PAGE_STEP;
    const distance = Math.abs(progress - index);
    return {
      opacity: interpolate(distance, [0, 0.6, 1], [1, 0.7, 0.4], "clamp"),
      transform: [
        { scale: interpolate(distance, [0, 1], [1, 0.88], "clamp") },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          width: SCREEN_WIDTH,
          height: SCREEN_HEIGHT,
          marginEnd: PAGE_GAP,
          overflow: "hidden",
          borderRadius: 0,
        },
        fadeStyle,
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  viewport: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    overflow: "hidden",
  },
  screenHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  screenHeaderBack: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
});
