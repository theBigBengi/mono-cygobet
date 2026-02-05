// features/group-creation/screens/CreateGroupScreen.tsx
// Main screen for creating a new group - mode selector (Upcoming games | Leagues | Teams) + conditional view.

import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useSetAtom } from "jotai";
import { useTheme } from "@/lib/theme";
import {
  SelectionModeTabs,
  FixturesView,
  LeaguesView,
  TeamsView,
  CreateGroupModal,
  type SelectionMode,
} from "../components";
import { currentSelectionModeAtom } from "../selection/mode.atom";

export function CreateGroupScreen() {
  const { theme } = useTheme();
  const [mode, setMode] = useState<SelectionMode>("fixtures");
  const setGlobalMode = useSetAtom(currentSelectionModeAtom);

  // Sync local mode state with global atom
  useEffect(() => {
    setGlobalMode(mode);
  }, [mode, setGlobalMode]);

  const handleModeChange = (newMode: SelectionMode) => {
    setMode(newMode);
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.content}>
        {mode === "fixtures" && (
          <FixturesView
            tabs={
              <SelectionModeTabs value={mode} onChange={handleModeChange} />
            }
          />
        )}
        {mode === "leagues" && (
          <LeaguesView
            tabs={
              <SelectionModeTabs value={mode} onChange={handleModeChange} />
            }
          />
        )}
        {mode === "teams" && (
          <TeamsView
            tabs={
              <SelectionModeTabs value={mode} onChange={handleModeChange} />
            }
          />
        )}
      </View>
      <CreateGroupModal />
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
