// features/group-creation/components/TeamListItem.tsx
// Single team list item. Toggle selection. Shows +/× toggle when selected.

import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Card, AppText, TeamLogo } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import {
  useToggleTeam,
  useIsTeamSelected,
} from "@/features/group-creation/selection/teams";
import { SelectionToggleButton } from "./SelectionToggleButton";
import type { ApiTeamItem } from "@repo/types";

interface TeamListItemProps {
  team: ApiTeamItem;
}

export function TeamListItem({ team }: TeamListItemProps) {
  const { theme } = useTheme();
  const toggleTeam = useToggleTeam();
  const isSelected = useIsTeamSelected(team.id);

  return (
    <Pressable
      onPress={() => toggleTeam(team)}
      style={({ pressed }) => [styles.wrapper, { opacity: pressed ? 0.8 : 1 }]}
    >
      <Card
        style={[styles.card, { backgroundColor: theme.colors.cardBackground }]}
      >
        <View style={styles.row}>
          <TeamLogo imagePath={team.imagePath} teamName={team.name} size={32} />
          <View style={styles.nameContainer}>
            <AppText variant="body" style={styles.name}>
              {team.name}
            </AppText>
            {team.country?.name && (
              <AppText variant="caption" color="secondary">
                {team.country.name}
              </AppText>
            )}
          </View>
          <SelectionToggleButton
            isSelected={isSelected}
            onPress={() => toggleTeam(team)}
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
    marginBottom: 8,
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
