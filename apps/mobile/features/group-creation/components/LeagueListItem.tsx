// features/group-creation/components/LeagueListItem.tsx
// Single league list item. Toggle selection (max 1). Shows +/× toggle when selected.

import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Card, AppText, TeamLogo } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import {
  useToggleLeague,
  useIsLeagueSelected,
} from "@/features/group-creation/selection/leagues";
import { SelectionToggleButton } from "./SelectionToggleButton";
import type { ApiLeagueItem } from "@repo/types";

interface LeagueListItemProps {
  league: ApiLeagueItem;
}

export function LeagueListItem({ league }: LeagueListItemProps) {
  const { theme } = useTheme();
  const toggleLeague = useToggleLeague();
  const isSelected = useIsLeagueSelected(league.id);

  return (
    <Pressable
      onPress={() => toggleLeague(league)}
      style={({ pressed }) => [styles.wrapper, { opacity: pressed ? 0.8 : 1 }]}
    >
      <Card
        style={[styles.card, { backgroundColor: theme.colors.cardBackground }]}
      >
        <View style={styles.row}>
          <TeamLogo
            imagePath={league.imagePath}
            teamName={league.name}
            size={32}
          />
          <View style={styles.nameContainer}>
            <AppText variant="body" style={styles.name}>
              {league.name}
            </AppText>
            {league.country?.name && (
              <AppText variant="caption" color="secondary">
                {league.country.name}
              </AppText>
            )}
          </View>
          <SelectionToggleButton
            isSelected={isSelected}
            onPress={() => toggleLeague(league)}
          />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 0,
  },
  card: {
    borderRadius: 0,
    marginBottom: -1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  nameContainer: {
    marginStart: 12,
    flex: 1,
  },
  name: {},
});
