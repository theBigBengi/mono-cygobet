// features/group-creation/components/TeamListItem.tsx
// Single team list item. Toggle selection. Shows check when selected.

import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Card, AppText, TeamLogo } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { MaterialIcons } from "@expo/vector-icons";
import { useToggleTeam, useIsTeamSelected } from "@/features/group-creation/selection/teams";
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
            imagePath={team.imagePath}
            teamName={team.name}
            size={32}
          />
          <AppText variant="body" style={styles.name}>
            {team.name}
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
    marginLeft: 12,
    flex: 1,
  },
  check: {
    marginLeft: 8,
  },
});
