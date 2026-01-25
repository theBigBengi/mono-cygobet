// app/(tabs)/home.tsx
// Games tab – mode selector (Upcoming games | Leagues | Teams) + conditional view.

import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/lib/theme";
import {
  HomeModeSelector,
  HomeFixturesView,
  HomeLeaguesView,
  HomeTeamsView,
  FloatingCreateGroupButton,
  CreateGroupFromSelectionModal,
  type HomeMode,
} from "@/features/home";

export default function GamesScreen() {
  const { theme } = useTheme();
  const [mode, setMode] = useState<HomeMode>("fixtures");
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View
        style={{
          paddingHorizontal: theme.spacing.md,
          paddingTop: theme.spacing.sm,
          paddingBottom: theme.spacing.sm,
        }}
      >
        <HomeModeSelector value={mode} onChange={setMode} />
      </View>
      <View style={styles.content}>
        {mode === "fixtures" && <HomeFixturesView />}
        {mode === "leagues" && <HomeLeaguesView />}
        {mode === "teams" && <HomeTeamsView />}
      </View>
      <FloatingCreateGroupButton
        mode={mode}
        onPress={() => setModalVisible(true)}
      />
      <CreateGroupFromSelectionModal
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
        mode={mode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
