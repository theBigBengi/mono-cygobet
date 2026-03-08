import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Dimensions,
  Animated,
} from "react-native";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { AppText, TeamLogo } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useEntityTranslation } from "@/lib/i18n/i18n.entities";
import type { FixtureItem } from "@/types/common";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SLIDER_ITEM_WIDTH = 80;
const SLIDER_ITEM_MARGIN = 2;
const SLIDER_ITEM_TOTAL = SLIDER_ITEM_WIDTH + SLIDER_ITEM_MARGIN;
const LOGO_SIZE = 16;
/** Width of the back button area in the header */
const BACK_BUTTON_WIDTH = 52;

/**
 * Padding to center items on the TRUE screen center (not container center).
 * Left padding is reduced because the back button already adds offset.
 */
function getHorizontalPadding(leftOffset: number): { left: number; right: number } {
  const screenCenter = SCREEN_WIDTH / 2;
  const itemHalfWidth = SLIDER_ITEM_WIDTH / 2;
  // Left padding: distance from container start to where first item should start
  // to have its center at screen center
  const leftPadding = screenCenter - leftOffset - itemHalfWidth;
  // Right padding: distance from last item end to container end
  // to allow last item's center to be at screen center
  const rightPadding = screenCenter - itemHalfWidth;
  return {
    left: Math.max(0, leftPadding),
    right: Math.max(0, rightPadding),
  };
}

/** Offset to center the item at the given index on TRUE screen center. */
function getOffsetForIndex(index: number, leftOffset: number): number {
  const padding = getHorizontalPadding(leftOffset);
  const containerWidth = SCREEN_WIDTH - leftOffset;
  // Item center position within the scrollable content
  const itemCenter = padding.left + index * SLIDER_ITEM_TOTAL + SLIDER_ITEM_WIDTH / 2;
  // We want this item center to appear at the screen center
  // Screen center relative to container = containerWidth / 2
  // But we want TRUE screen center, which is (SCREEN_WIDTH / 2 - leftOffset) from container start
  const targetPosition = SCREEN_WIDTH / 2 - leftOffset;
  return Math.max(0, itemCenter - targetPosition);
}


export type GameSliderProps = {
  fixtures: FixtureItem[];
  currentIndex: number;
  onSelectGame: (index: number) => void;
  /** Left offset to account for (e.g., back button width) */
  leftOffset?: number;
};

export function GameSlider({
  fixtures,
  currentIndex,
  onSelectGame,
  leftOffset = BACK_BUTTON_WIDTH,
}: GameSliderProps) {
  const { theme } = useTheme();
  const { t } = useTranslation("common");
  const { translateTeam } = useEntityTranslation();
  const flatListRef = useRef<FlatList>(null);
  const prevIndexRef = useRef(currentIndex);
  const [isReady, setIsReady] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;

  const padding = getHorizontalPadding(leftOffset);

  // Initial scroll (hidden) + fade in
  useEffect(() => {
    if (isReady) return;
    if (fixtures.length === 0) return;

    let innerTimer: ReturnType<typeof setTimeout> | null = null;
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToOffset({
        offset: getOffsetForIndex(currentIndex, leftOffset),
        animated: false,
      });

      innerTimer = setTimeout(() => {
        setIsReady(true);
        Animated.timing(opacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start();
      }, 50);
    }, 50);

    return () => {
      clearTimeout(timer);
      if (innerTimer) clearTimeout(innerTimer);
    };
  }, [fixtures.length, isReady, leftOffset]);

  // Animated scroll when index changes (after initial ready)
  useEffect(() => {
    if (!isReady) return;
    if (prevIndexRef.current === currentIndex) return;
    prevIndexRef.current = currentIndex;

    if (
      fixtures.length === 0 ||
      currentIndex < 0 ||
      currentIndex >= fixtures.length
    )
      return;

    flatListRef.current?.scrollToOffset({
      offset: getOffsetForIndex(currentIndex, leftOffset),
      animated: true,
    });
  }, [currentIndex, isReady, fixtures.length, leftOffset]);

  const renderItem = useCallback(
    ({ item: fixture, index }: { item: FixtureItem; index: number }) => {
      const homeAbbr = fixture.homeTeam?.shortCode ?? translateTeam(fixture.homeTeam?.name, t("common.home")).substring(0, 3).toUpperCase();
      const awayAbbr = fixture.awayTeam?.shortCode ?? translateTeam(fixture.awayTeam?.name, t("common.away")).substring(0, 3).toUpperCase();
      const isActive = index === currentIndex;

      return (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelectGame(index);
          }}
          style={({ pressed }) => [
            styles.item,
            {
              backgroundColor: "transparent",
              borderWidth: 0,
              shadowOpacity: 0,
            },
            { transform: [{ scale: pressed ? 0.95 : 1 }] },
          ]}
        >
          <View style={[styles.teamsRow, !isActive && { opacity: 0.4 }]}>
            <AppText
              variant="caption"
              numberOfLines={1}
              style={[
                styles.abbr,
                isActive && {
                  fontWeight: "700",
                  color: theme.colors.textPrimary,
                },
              ]}
            >
              {homeAbbr}
            </AppText>
            <AppText
              variant="caption"
              numberOfLines={1}
              style={[
                styles.abbr,
                { opacity: 0.5 },
              ]}
            >
              v
            </AppText>
            <AppText
              variant="caption"
              numberOfLines={1}
              style={[
                styles.abbr,
                isActive && {
                  fontWeight: "700",
                  color: theme.colors.textPrimary,
                },
              ]}
            >
              {awayAbbr}
            </AppText>
          </View>
        </Pressable>
      );
    },
    [currentIndex, theme, translateTeam, t, onSelectGame]
  );

  if (fixtures.length === 0) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, opacity },
      ]}
    >
      <FlatList
        ref={flatListRef}
        data={fixtures}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        extraData={currentIndex}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingLeft: padding.left, paddingRight: padding.right }}
        getItemLayout={(_, index) => ({
          length: SLIDER_ITEM_TOTAL,
          offset: padding.left + SLIDER_ITEM_TOTAL * index,
          index,
        })}
        windowSize={5}
        maxToRenderPerBatch={5}
        initialNumToRender={5}
        removeClippedSubviews
      />
      {/* Fade edges */}
      <LinearGradient
        colors={[theme.colors.background, theme.colors.background + "00"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.fadeLeft}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[theme.colors.background + "00", theme.colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.fadeRight}
        pointerEvents="none"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    minHeight: 48,
    position: "relative",
  },
  fadeLeft: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 40,
  },
  fadeRight: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 40,
  },
  item: {
    width: SLIDER_ITEM_WIDTH,
    marginEnd: SLIDER_ITEM_MARGIN,
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 4,
    flexDirection: "column",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  teamsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 2,
    width: "100%",
  },
  teamGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  abbr: {
    fontSize: 10,
    fontWeight: "500",
  },
});
