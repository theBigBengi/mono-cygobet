// features/profile/head-to-head/components/OpponentSelector.tsx
// List of users from shared groups to pick opponent.

import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { AppText, Card } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { ApiH2HOpponentItem } from "@repo/types";

interface OpponentSelectorProps {
  opponents: ApiH2HOpponentItem[];
  selectedOpponentId: number | null;
  onSelectOpponent: (opponentId: number) => void;
}

export function OpponentSelector({
  opponents,
  selectedOpponentId,
  onSelectOpponent,
}: OpponentSelectorProps) {
  const { theme } = useTheme();

  if (opponents.length === 0) {
    return (
      <Card>
        <AppText variant="body" color="secondary">
          No shared groups with other players
        </AppText>
      </Card>
    );
  }

  return (
    <Card>
      <AppText variant="subtitle" style={styles.title}>
        Compare with
      </AppText>
      <View style={styles.list}>
        {opponents.map((opp) => (
          <Pressable
            key={opp.id}
            onPress={() => onSelectOpponent(opp.id)}
            style={({ pressed }) => [
              styles.item,
              {
                padding: theme.spacing.md,
                backgroundColor:
                  selectedOpponentId === opp.id
                    ? theme.colors.primary + "20"
                    : pressed
                      ? theme.colors.border + "40"
                      : "transparent",
                borderRadius: theme.radius.md,
              },
            ]}
          >
            <AppText variant="body">
              {opp.username ?? `Player #${opp.id}`}
            </AppText>
          </Pressable>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 12,
  },
  list: {
    gap: 8,
  },
  item: {
    marginBottom: 8,
  },
});
