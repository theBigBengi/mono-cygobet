// features/group-creation/components/LeagueListItem.tsx
// Single league list item. Toggle selection (max 1). Shows check when selected.

import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Card, AppText, TeamLogo } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { MaterialIcons } from "@expo/vector-icons";
import { useToggleLeague, useIsLeagueSelected } from "@/features/group-creation/selection/leagues";
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
      style={({ pressed }) => [
        styles.wrapper,
        { opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Card
        style={[
          styles.card,
          isSelected && {
            borderColor: theme.colors.primary,
            borderWidth: 2,
          },
        ]}
      >
        <View style={styles.row}>
          <TeamLogo
            imagePath={league.imagePath}
            teamName={league.name}
            size={32}
          />
          <AppText variant="body" style={styles.name}>
            {league.name}
          </AppText>
          {isSelected && (
            <MaterialIcons
              name="check"
              size={22}
              color={theme.colors.primary}
              style={styles.check}
            />
          )}
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
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  name: {
    marginStart: 12,
    flex: 1,
  },
  check: {
    marginStart: 8,
  },
});
