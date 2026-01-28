// components/GamesModeFilterTabs.tsx
// Filter tabs for games mode - shows Today and This Week only

import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";

interface GamesModeFilterTabsProps {
  hasTodayFixtures: boolean;
  hasThisWeekFixtures: boolean;
  selectedLeagueId: number | null;
  onSelectLeagueId: (leagueId: number | null) => void;
}

/**
 * Filter tabs for games mode.
 * Displays only "Today" and "This Week" buttons (no "All" or leagues).
 */
export function GamesModeFilterTabs({
  hasTodayFixtures,
  hasThisWeekFixtures,
  selectedLeagueId,
  onSelectLeagueId,
}: GamesModeFilterTabsProps) {
  const { theme } = useTheme();

  if (!hasTodayFixtures && !hasThisWeekFixtures) {
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
