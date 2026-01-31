// features/group-creation/screens/CreateGroupModalLeaguesView.tsx
// View for displaying selected leagues in create group modal.

import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable } from "react-native";
import { AppText, Card } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import {
  useSelectedLeagues,
  useToggleLeague,
} from "@/features/group-creation/selection/leagues";
import { MaterialIcons } from "@expo/vector-icons";

export function CreateGroupModalLeaguesView() {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const leagues = useSelectedLeagues();
  const toggleLeague = useToggleLeague();

  if (leagues.length === 0) {
    return (
      <View style={styles.empty}>
        <AppText variant="body" color="secondary">
          {t("fixtures.noLeagueSelected")}
        </AppText>
      </View>
    );
  }

  return (
    <>
      {leagues.map((l) => (
        <Card key={l.id} style={styles.listCard}>
          <View style={styles.row}>
            <AppText variant="body" style={styles.flex1}>
              {l.name}
            </AppText>
            <Pressable
              onPress={() => toggleLeague(l)}
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
