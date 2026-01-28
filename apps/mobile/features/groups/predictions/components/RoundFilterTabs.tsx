// components/RoundFilterTabs.tsx
// Filter tabs for leagues mode - shows rounds

import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";

interface RoundFilterTabsProps {
  availableRounds: string[];
  selectedRound: string | null;
  onSelectRound: (round: string | null) => void;
}

/**
 * Round filter tabs for leagues mode.
 * Displays "All" button and round buttons.
 */
export function RoundFilterTabs({
  availableRounds,
  selectedRound,
  onSelectRound,
}: RoundFilterTabsProps) {
  const { theme } = useTheme();

  if (availableRounds.length === 0) {
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
          onPress={() => onSelectRound(null)}
          style={[
            styles.button,
            selectedRound === null && styles.buttonActive,
            {
              backgroundColor:
                selectedRound === null
                  ? theme.colors.primary
                  : theme.colors.cardBackground,
            },
          ]}
        >
          <AppText
            variant="caption"
            style={[
              styles.text,
              selectedRound === null && styles.textActive,
              {
                color:
                  selectedRound === null
                    ? theme.colors.primaryText
                    : theme.colors.textSecondary,
              },
            ]}
          >
            All
          </AppText>
        </Pressable>
        {availableRounds.map((round) => (
          <Pressable
            key={round}
            onPress={() => onSelectRound(round)}
            style={[
              styles.button,
              selectedRound === round && styles.buttonActive,
              {
                backgroundColor:
                  selectedRound === round
                    ? theme.colors.primary
                    : theme.colors.cardBackground,
              },
            ]}
          >
            <AppText
              variant="caption"
              style={[
                styles.text,
                selectedRound === round && styles.textActive,
                {
                  color:
                    selectedRound === round
                      ? theme.colors.primaryText
                      : theme.colors.textSecondary,
                },
              ]}
            >
              {round}
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
