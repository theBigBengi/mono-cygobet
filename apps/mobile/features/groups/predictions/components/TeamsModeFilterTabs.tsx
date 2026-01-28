// components/TeamsModeFilterTabs.tsx
// Filter tabs for teams mode - shows All, Today, This Week, and Leagues

import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { ApiGroupGamesFiltersLeagueItem } from "@repo/types";

interface TeamsModeFilterTabsProps {
  availableLeagues: ApiGroupGamesFiltersLeagueItem[];
  hasTodayFixtures: boolean;
  hasThisWeekFixtures: boolean;
  selectedLeagueId: number | null;
  onSelectLeagueId: (leagueId: number | null) => void;
}

/**
 * Filter tabs for teams mode.
 * Displays "All", "Today", "This Week", and league buttons.
 */
export function TeamsModeFilterTabs({
  availableLeagues,
  hasTodayFixtures,
  hasThisWeekFixtures,
  selectedLeagueId,
  onSelectLeagueId,
}: TeamsModeFilterTabsProps) {
  const { theme } = useTheme();

  const shouldShow =
    availableLeagues.length > 0 || hasTodayFixtures || hasThisWeekFixtures;

  if (!shouldShow) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Pressable
          onPress={() => onSelectLeagueId(null)}
          style={[
            styles.button,
            selectedLeagueId === null && styles.buttonActive,
            {
              backgroundColor:
                selectedLeagueId === null
                  ? theme.colors.primary
                  : theme.colors.cardBackground,
            },
          ]}
        >
          <AppText
            variant="caption"
            style={[
              styles.text,
              selectedLeagueId === null && styles.textActive,
              {
                color:
                  selectedLeagueId === null
                    ? theme.colors.primaryText
                    : theme.colors.textSecondary,
              },
            ]}
          >
            All
          </AppText>
        </Pressable>
        {hasTodayFixtures && (
          <Pressable
            onPress={() => onSelectLeagueId(-2)}
            style={[
              styles.button,
              selectedLeagueId === -2 && styles.buttonActive,
              {
                backgroundColor:
                  selectedLeagueId === -2
                    ? theme.colors.primary
                    : theme.colors.cardBackground,
              },
            ]}
          >
            <AppText
              variant="caption"
              style={[
                styles.text,
                selectedLeagueId === -2 && styles.textActive,
                {
                  color:
                    selectedLeagueId === -2
                      ? theme.colors.primaryText
                      : theme.colors.textSecondary,
                },
              ]}
            >
              Today
            </AppText>
          </Pressable>
        )}
        {hasThisWeekFixtures && (
          <Pressable
            onPress={() => onSelectLeagueId(-1)}
            style={[
              styles.button,
              selectedLeagueId === -1 && styles.buttonActive,
              {
                backgroundColor:
                  selectedLeagueId === -1
                    ? theme.colors.primary
                    : theme.colors.cardBackground,
              },
            ]}
          >
            <AppText
              variant="caption"
              style={[
                styles.text,
                selectedLeagueId === -1 && styles.textActive,
                {
                  color:
                    selectedLeagueId === -1
                      ? theme.colors.primaryText
                      : theme.colors.textSecondary,
                },
              ]}
            >
              This Week
            </AppText>
          </Pressable>
        )}
        {availableLeagues.map((league) => (
          <Pressable
            key={league.id}
            onPress={() => onSelectLeagueId(league.id)}
            style={[
              styles.button,
              selectedLeagueId === league.id && styles.buttonActive,
              {
                backgroundColor:
                  selectedLeagueId === league.id
                    ? theme.colors.primary
                    : theme.colors.cardBackground,
              },
            ]}
          >
            <AppText
              variant="caption"
              style={[
                styles.text,
                selectedLeagueId === league.id && styles.textActive,
                {
                  color:
                    selectedLeagueId === league.id
                      ? theme.colors.primaryText
                      : theme.colors.textSecondary,
                },
              ]}
            >
              {league.name}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 64, // HEADER_HEIGHT
    left: 0,
    right: 0,
    zIndex: 5,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  content: {
    paddingHorizontal: 12,
    gap: 8,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minHeight: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonActive: {
    // Active state handled by backgroundColor in inline style
  },
  text: {
    fontSize: 13,
    fontWeight: "500",
  },
  textActive: {
    fontWeight: "600",
  },
});
