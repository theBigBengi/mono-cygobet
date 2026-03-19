import React, { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from "react-native";
import { Card, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { GroupLobbyFixtureCard } from "./GroupLobbyFixtureCard";
import type { FixtureItem } from "@/types/common";

const GAME_CARD_WIDTH = 280;
const CARD_SPACING = 12;

interface GroupLobbyFixturesSectionProps {
  /**
   * Array of fixtures to display
   */
  fixtures: FixtureItem[];
  /**
   * Group ID for navigation
   */
  groupId: number | null;
  /**
   * Callback to navigate to view all games. Ignored when onBannerPress is set.
   */
  onViewAll?: () => void;
  /**
   * When true, render the fixture cards (horizontal scroll).
   * Default false to preserve current behavior for active lobby.
   */
  showFixtureCards?: boolean;
  /**
   * When true, display final scores (fixture.result) instead of predictions.
   * Used for ended groups.
   */
  showFinalScores?: boolean;
  /**
   * Custom banner title (e.g. "Predictions"). When set, used instead of default "Selected games" / "Games".
   */
  bannerTitle?: string;
  /**
   * When set, the whole banner card is pressable and navigates with this callback.
   * "View all games" is hidden when this is set.
   */
  onBannerPress?: () => void;
  /**
   * Number of predictions made (for progress display when bannerTitle is set).
   */
  predictionsCount?: number;
  /**
   * Total number of games/fixtures (for progress display when bannerTitle is set).
   */
  totalFixtures?: number;
  /**
   * Custom icon element to display before the title.
   */
  icon?: React.ReactNode;
}

/**
 * Component for displaying the selected games section.
 * Handles loading, error, empty, and populated states.
 * Manages horizontal scroll view for fixtures.
 *
 * The game cards are displayed outside the main card container,
 * allowing them to peek from the sides of the screen.
 */
export function GroupLobbyFixturesSection({
  fixtures,
  groupId,
  onViewAll,
  showFixtureCards = false,
  showFinalScores = false,
  bannerTitle,
  onBannerPress,
  predictionsCount,
  totalFixtures,
  icon,
}: GroupLobbyFixturesSectionProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  // Ensure fixtures is always an array - handle both undefined and non-array cases
  const safeFixtures = Array.isArray(fixtures) ? fixtures : [];
  const gamesCount = safeFixtures.length;
  const screenWidth = Dimensions.get("window").width;

  const titleText =
    bannerTitle ??
    (showFinalScores
      ? gamesCount > 0
        ? `${t("lobby.games")} (${gamesCount})`
        : t("lobby.games")
      : gamesCount > 0
        ? `${t("lobby.selectedGames")} (${gamesCount})`
        : t("lobby.selectedGames"));

  const showViewAll = gamesCount > 0 && !onBannerPress && onViewAll;

  const showProgress =
    bannerTitle &&
    totalFixtures !== undefined &&
    predictionsCount !== undefined &&
    totalFixtures > 0;
  const progressPercent = showProgress
    ? (predictionsCount! / totalFixtures!) * 100
    : 0;

  // Calculate snap offsets - each card should snap to center
  const snapOffsets = safeFixtures.map((_, index) => {
    const cardWidth = GAME_CARD_WIDTH;
    const spacing = CARD_SPACING;
    const padding = theme.spacing.md;

    // Position to center the card: card position - (screen width / 2) + (card width / 2)
    return (
      index * (cardWidth + spacing) + padding - screenWidth / 2 + cardWidth / 2
    );
  });

  // Scroll to first card (centered) when fixtures are loaded
  useEffect(() => {
    if (gamesCount > 0 && scrollViewRef.current) {
      const padding = theme.spacing.md;
      const firstOffset = padding - screenWidth / 2 + GAME_CARD_WIDTH / 2;
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          x: Math.max(0, firstOffset),
          animated: false,
        });
      }, 100);
    }
  }, [gamesCount]);

  const headerContent = (
    <>
      <View style={[styles.gamesHeaderRow, { marginBottom: theme.spacing.sm }]}>
        {icon && <View style={[styles.iconWrapper, { marginEnd: theme.spacing.sm }]}>{icon}</View>}
        <AppText variant="body" style={styles.gamesTitle}>
          {titleText}
        </AppText>
        {showViewAll && (
          <Pressable
            onPress={onViewAll}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <AppText
              variant="caption"
              color="secondary"
              style={[styles.viewAllText, { marginStart: theme.spacing.sm }]}
            >
              {t("lobby.viewAllGames")}
            </AppText>
          </Pressable>
        )}
      </View>

      {showProgress && (
        <View style={[styles.progressBlock, { marginTop: theme.spacing.xs }]}>
          <AppText
            variant="caption"
            color="secondary"
            style={[styles.progressText, { marginBottom: theme.spacing.xs }]}
          >
            {t("lobby.predictionsProgress", {
              count: predictionsCount!,
              total: totalFixtures!,
            })}
          </AppText>
          <View
            style={[
              styles.progressTrack,
              { backgroundColor: theme.colors.border },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: theme.colors.primary,
                  width: `${progressPercent}%`,
                },
              ]}
            />
          </View>
        </View>
      )}

      {gamesCount === 0 && (
        <AppText variant="caption" color="secondary">
          {t("predictions.noGamesSelected")}
        </AppText>
      )}
    </>
  );

  return (
    <View style={[styles.container, { marginBottom: theme.spacing.md }]}>
      {/* Header Card - contains only the title and actions */}
      <Card style={[styles.headerCard, { marginBottom: theme.spacing.sm }]}>
        {onBannerPress ? (
          <Pressable
            onPress={onBannerPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {headerContent}
          </Pressable>
        ) : (
          headerContent
        )}
      </Card>

      {/* Game Cards - outside the card, peeking from sides */}
      {showFixtureCards && gamesCount > 0 && (
        <ScrollView
          ref={scrollViewRef}
          horizontal
          decelerationRate="fast"
          snapToOffsets={snapOffsets}
          snapToAlignment="center"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.gamesList,
            { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
          ]}
          style={[
            styles.gamesScrollView,
            { marginHorizontal: -theme.spacing.md },
          ]}
        >
          {safeFixtures.map((fixture) => (
            <View key={fixture.id} style={styles.gameItemWrapper}>
              <GroupLobbyFixtureCard
                fixture={fixture}
                showFinalScore={showFinalScores}
              />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  headerCard: {},
  gamesHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gamesTitle: {
    fontWeight: "600",
    flex: 1,
  },
  iconWrapper: {},
  viewAllText: {},
  gamesLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  gamesLoadingText: {},
  gamesErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  gamesScrollView: {
    // Negative margin will be applied via inline style to match Screen padding
  },
  gamesList: {
    // Padding will be applied via inline style to allow first/last cards to peek
  },
  gameItemWrapper: {
    width: GAME_CARD_WIDTH,
    marginEnd: CARD_SPACING,
  },
  progressBlock: {},
  progressText: {},
  progressTrack: {
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
  },
});
