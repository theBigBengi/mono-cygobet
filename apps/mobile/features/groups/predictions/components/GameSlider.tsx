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
import { AppText, TeamLogo } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useEntityTranslation } from "@/lib/i18n/i18n.entities";
import type { FixtureItem } from "@/types/common";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SLIDER_ITEM_WIDTH = 110;
const SLIDER_ITEM_MARGIN = 8;
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

function getTeamAbbr(teamName: string): string {
  const trimmed = teamName.trim();
  if (!trimmed) return "—";
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return words
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join("");
  }
  return trimmed.substring(0, 3).toUpperCase();
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

    const timer = setTimeout(() => {
      flatListRef.current?.scrollToOffset({
        offset: getOffsetForIndex(currentIndex, leftOffset),
        animated: false,
      });

      setTimeout(() => {
        setIsReady(true);
        Animated.timing(opacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start();
      }, 50);
    }, 50);

    return () => clearTimeout(timer);
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
      const homeName = translateTeam(fixture.homeTeam?.name, t("common.home"));
      const awayName = translateTeam(fixture.awayTeam?.name, t("common.away"));
      const homeAbbr = getTeamAbbr(homeName);
      const awayAbbr = getTeamAbbr(awayName);
      const isActive = index === currentIndex;

      return (
        <Pressable
          onPress={() => onSelectGame(index)}
          style={[
            styles.item,
            {
              backgroundColor: isActive
                ? `${theme.colors.primary}18`
                : theme.colors.surface,
              borderColor: isActive
                ? theme.colors.primary
                : theme.colors.border,
              borderWidth: isActive ? 1.5 : 1,
            },
          ]}
        >
          {/* Row 1: logos + short names */}
          <View style={styles.teamsRow}>
            <View style={styles.teamGroup}>
              <TeamLogo
                imagePath={fixture.homeTeam?.imagePath}
                teamName={homeName}
                size={LOGO_SIZE}
              />
              <AppText
                variant="caption"
                numberOfLines={1}
                style={[
                  styles.abbr,
                  isActive && {
                    fontWeight: "600",
                    color: theme.colors.primary,
                  },
                ]}
              >
                {homeAbbr}
              </AppText>
            </View>
            <View style={styles.teamGroup}>
              <AppText
                variant="caption"
                numberOfLines={1}
                style={[
                  styles.abbr,
                  isActive && {
                    fontWeight: "600",
                    color: theme.colors.primary,
                  },
                ]}
              >
                {awayAbbr}
              </AppText>
              <TeamLogo
                imagePath={fixture.awayTeam?.imagePath}
                teamName={awayName}
                size={LOGO_SIZE}
              />
            </View>
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    minHeight: 48,
  },
  item: {
    width: SLIDER_ITEM_WIDTH,
    marginRight: SLIDER_ITEM_MARGIN,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: "column",
  },
  teamsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
