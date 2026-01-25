import React, { useRef, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Dimensions } from "react-native";
import { Card, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { GroupLobbyFixtureCard } from "./GroupLobbyFixtureCard";
import type { FixtureItem } from "../types";

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
   * Callback to navigate to view all games
   */
  onViewAll: () => void;
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
}: GroupLobbyFixturesSectionProps) {
  const { theme } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  // Ensure fixtures is always an array - handle both undefined and non-array cases
  const safeFixtures = Array.isArray(fixtures) ? fixtures : [];
  const gamesCount = safeFixtures.length;
  const screenWidth = Dimensions.get("window").width;

  // Calculate snap offsets - each card should snap to center
  const snapOffsets = safeFixtures.map((_, index) => {
    const cardWidth = GAME_CARD_WIDTH;
    const spacing = CARD_SPACING;
    const padding = theme.spacing.md;
    
    // Position to center the card: card position - (screen width / 2) + (card width / 2)
    return (
      index * (cardWidth + spacing) +
      padding -
      (screenWidth / 2) +
      (cardWidth / 2)
    );
  });

  // Scroll to first card (centered) when fixtures are loaded
  useEffect(() => {
    if (gamesCount > 0 && scrollViewRef.current && snapOffsets.length > 0) {
      // Use setTimeout to ensure layout is complete
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          x: Math.max(0, snapOffsets[0]),
          animated: false,
        });
      }, 100);
    }
  }, [gamesCount, snapOffsets]);

  return (
    <View style={styles.container}>
      {/* Header Card - contains only the title and actions */}
      <Card style={styles.headerCard}>
        <View style={styles.gamesHeaderRow}>
          <AppText variant="body" style={styles.gamesTitle}>
            {gamesCount > 0
              ? `Selected games (${gamesCount})`
              : "Selected games"}
          </AppText>
          {gamesCount > 3 && (
            <Pressable
              onPress={onViewAll}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <AppText
                variant="caption"
                color="secondary"
                style={styles.viewAllText}
              >
                View all games
              </AppText>
            </Pressable>
          )}
        </View>

        {gamesCount === 0 && (
          <AppText variant="caption" color="secondary">
            No games selected for this group yet.
          </AppText>
        )}
      </Card>

      {/* Game Cards - outside the card, peeking from sides */}
      {gamesCount > 0 && (
        <ScrollView
          ref={scrollViewRef}
          horizontal
          decelerationRate="fast"
          snapToOffsets={snapOffsets}
          snapToAlignment="center"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.gamesList,
            { paddingHorizontal: theme.spacing.md },
          ]}
          style={[
            styles.gamesScrollView,
            { marginHorizontal: -theme.spacing.md },
          ]}
        >
          {safeFixtures.map((fixture) => (
            <View key={fixture.id} style={styles.gameItemWrapper}>
              <GroupLobbyFixtureCard fixture={fixture} />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  headerCard: {
    marginBottom: 8,
  },
  gamesHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  gamesTitle: {
    fontWeight: "600",
  },
  viewAllText: {
    marginLeft: 8,
  },
  gamesLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  gamesLoadingText: {
    marginLeft: 8,
  },
  gamesErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  gamesScrollView: {
    // Negative margin will be applied via inline style to match Screen padding
  },
  gamesList: {
    // Padding will be applied via inline style to allow first/last cards to peek
    paddingVertical: 8,
  },
  gameItemWrapper: {
    width: GAME_CARD_WIDTH,
    marginRight: CARD_SPACING,
  },
});
