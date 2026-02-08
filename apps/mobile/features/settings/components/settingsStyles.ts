// features/settings/components/settingsStyles.ts
// Shared styles used across SettingsRow, SettingsRowPicker, and SettingsRowBottomSheet.

import { StyleSheet } from "react-native";

export const settingsSharedStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    fontWeight: "500",
  },
});
