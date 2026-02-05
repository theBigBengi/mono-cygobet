import React, { useRef, useEffect } from "react";
import { View, StyleSheet, FlatList, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText, TeamLogo } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useEntityTranslation } from "@/lib/i18n/i18n.entities";
import type { FixtureItem } from "@/types/common";
import { getGameResultOrTime } from "../utils/fixture-helpers";

const SLIDER_ITEM_WIDTH = 110;
const SLIDER_ITEM_MARGIN = 8;
const SLIDER_ITEM_TOTAL = SLIDER_ITEM_WIDTH + SLIDER_ITEM_MARGIN;
const LOGO_SIZE = 16;

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

function getCenterLabel(fixture: FixtureItem): string {
  const result = getGameResultOrTime(fixture);
  if (!result) return "—";
  if (result.time) return result.time;
  if (result.home != null && result.away != null)
    return `${result.home}-${result.away}`;
  if (result.home) return result.home;
  return "—";
}

export type GameSliderProps = {
  fixtures: FixtureItem[];
  currentIndex: number;
  onSelectGame: (index: number) => void;
};

export function GameSlider({
  fixtures,
  currentIndex,
  onSelectGame,
}: GameSliderProps) {
  const { theme } = useTheme();
  const { t } = useTranslation("common");
  const { translateTeam } = useEntityTranslation();
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (
      fixtures.length === 0 ||
      currentIndex < 0 ||
      currentIndex >= fixtures.length
    )
      return;
    flatListRef.current?.scrollToIndex({
      index: currentIndex,
      animated: true,
      viewPosition: 0.5,
    });
  }, [currentIndex, fixtures.length]);

  const renderItem = ({
    item: fixture,
    index,
  }: {
    item: FixtureItem;
    index: number;
  }) => {
    const homeName = translateTeam(fixture.homeTeam?.name, t("common.home"));
    const awayName = translateTeam(fixture.awayTeam?.name, t("common.away"));
    const homeAbbr = getTeamAbbr(homeName);
    const awayAbbr = getTeamAbbr(awayName);
    const centerLabel = getCenterLabel(fixture);
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
            borderColor: isActive ? theme.colors.primary : theme.colors.border,
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
                isActive && { fontWeight: "600", color: theme.colors.primary },
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
                isActive && { fontWeight: "600", color: theme.colors.primary },
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
        {/* Row 2: time/score centered */}
        <AppText
          variant="caption"
          numberOfLines={1}
          style={[styles.center, { color: theme.colors.textSecondary }]}
        >
          {centerLabel}
        </AppText>
      </Pressable>
    );
  };

  if (fixtures.length === 0) return null;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <FlatList
        ref={flatListRef}
        data={fixtures}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
        onScrollToIndexFailed={(info) => {
          const wait = new Promise((resolve) => setTimeout(resolve, 100));
          wait.then(() => {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: true,
              viewPosition: 0.5,
            });
          });
        }}
        getItemLayout={(_, index) => ({
          length: SLIDER_ITEM_TOTAL,
          offset: SLIDER_ITEM_TOTAL * index,
          index,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    minHeight: 64,
  },
  content: {
    paddingHorizontal: 8,
  },
  item: {
    width: SLIDER_ITEM_WIDTH,
    marginRight: SLIDER_ITEM_MARGIN,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexDirection: "column",
    gap: 4,
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
  center: {
    fontSize: 10,
    textAlign: "center",
  },
});
