// app/(tabs)/home.tsx
// Games tab – mode selector (Upcoming games | Leagues | Teams) + conditional view.

import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/lib/theme";
import {
  CreateGroupScreen,
  type SelectionMode,
} from "@/features/group-creation";

export default function GamesScreen() {
  return <CreateGroupScreen />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
