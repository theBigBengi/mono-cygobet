// features/group-creation/screens/CreateGroupScreen.tsx
// Main screen for creating a new group - mode selector (Upcoming games | Leagues | Teams) + conditional view.

import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSetAtom } from "jotai";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useTheme } from "@/lib/theme";
import {
  SelectionModeTabs,
  SelectionModeInfoSheet,
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
  const infoSheetRef = useRef<BottomSheetModal>(null);

  // Sync local mode state with global atom
  useEffect(() => {
    setGlobalMode(mode);
  }, [mode, setGlobalMode]);

  // Keep the tab bar badge in sync with selection state
  useTabBarBadgeSync();

  const handleModeChange = (newMode: SelectionMode) => {
    setMode(newMode);
  };

  const handleInfoPress = useCallback(() => {
    infoSheetRef.current?.present();
  }, []);

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
                onInfoPress={handleInfoPress}
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
                onInfoPress={handleInfoPress}
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
                onInfoPress={handleInfoPress}
              />
            }
          />
        )}
      </View>
      <CreateGroupModal />
      <SelectionModeInfoSheet sheetRef={infoSheetRef} />
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
