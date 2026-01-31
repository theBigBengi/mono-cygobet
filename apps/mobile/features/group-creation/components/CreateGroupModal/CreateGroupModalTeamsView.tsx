// features/group-creation/screens/CreateGroupModalTeamsView.tsx
// View for displaying selected teams in create group modal.

import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable } from "react-native";
import { AppText, Card } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import {
  useSelectedTeams,
  useToggleTeam,
} from "@/features/group-creation/selection/teams";
import { MaterialIcons } from "@expo/vector-icons";

export function CreateGroupModalTeamsView() {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const teams = useSelectedTeams();
  const toggleTeam = useToggleTeam();

  if (teams.length === 0) {
    return (
      <View style={styles.empty}>
        <AppText variant="body" color="secondary">
          {t("fixtures.noTeamsSelected")}
        </AppText>
      </View>
    );
  }

  return (
    <>
      {teams.map((t) => (
        <Card key={t.id} style={styles.listCard}>
          <View style={styles.row}>
            <AppText variant="body" style={styles.flex1}>
              {t.name}
            </AppText>
            <Pressable
              onPress={() => toggleTeam(t)}
              style={({ pressed }) => [
                styles.removeBtn,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <MaterialIcons
                name="close"
                size={20}
                color={theme.colors.danger}
              />
            </Pressable>
          </View>
        </Card>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  listCard: {
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  flex1: {
    flex: 1,
  },
  removeBtn: {
    padding: 4,
  },
});
