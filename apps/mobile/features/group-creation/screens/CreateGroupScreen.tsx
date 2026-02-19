// features/group-creation/screens/CreateGroupScreen.tsx
// Main screen for creating a new group - mode selector (Upcoming games | Leagues | Teams) + conditional view.

import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
import { useTabBarBadgeSync } from "../hooks/useTabBarBadgeSync";

export function CreateGroupScreen() {
  const { theme } = useTheme();
  const [mode, setMode] = useState<SelectionMode>("fixtures");
  const setGlobalMode = useSetAtom(currentSelectionModeAtom);
  // Sync local mode state with global atom
  useEffect(() => {
    setGlobalMode(mode);
  }, [mode, setGlobalMode]);

  // Keep the tab bar badge in sync with selection state
  useTabBarBadgeSync();

  const handleModeChange = (newMode: SelectionMode) => {
    setMode(newMode);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["top", "left", "right"]}
    >
      <View style={styles.content}>
        {mode === "fixtures" && (
          <FixturesView
            tabs={
              <SelectionModeTabs
                value={mode}
                onChange={handleModeChange}
              />
            }
          />
        )}
        {mode === "leagues" && (
          <LeaguesView
            tabs={
              <SelectionModeTabs
                value={mode}
                onChange={handleModeChange}
              />
            }
          />
        )}
        {mode === "teams" && (
          <TeamsView
            tabs={
              <SelectionModeTabs
                value={mode}
                onChange={handleModeChange}
              />
            }
          />
        )}
      </View>
      <CreateGroupModal />
    </SafeAreaView>
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
