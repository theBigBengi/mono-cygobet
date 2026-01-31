// features/profile/head-to-head/components/ComparisonBar.tsx
// Side-by-side stat bar (user vs opponent).

import React from "react";
import { View, StyleSheet } from "react-native";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";

interface ComparisonBarProps {
  label: string;
  userValue: string | number;
  opponentValue: string | number;
  userLabel?: string;
  opponentLabel?: string;
}

export function ComparisonBar({
  label,
  userValue,
  opponentValue,
  userLabel,
  opponentLabel,
}: ComparisonBarProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.row, { paddingVertical: theme.spacing.sm }]}>
      <View style={styles.side}>
        <AppText variant="body" style={styles.value}>
          {userValue}
        </AppText>
        {userLabel && (
          <AppText variant="caption" color="secondary">
            {userLabel}
          </AppText>
        )}
      </View>
      <AppText variant="caption" color="secondary" style={styles.label}>
        {label}
      </AppText>
      <View style={[styles.side, { alignItems: "flex-end" }]}>
        <AppText variant="body" style={styles.value}>
          {opponentValue}
        </AppText>
        {opponentLabel && (
          <AppText variant="caption" color="secondary">
            {opponentLabel}
          </AppText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  side: {
    flex: 1,
    alignItems: "flex-start",
  },
  label: {
    flex: 0,
    marginHorizontal: 16,
    minWidth: 80,
    textAlign: "center",
  },
  value: {
    fontWeight: "600",
  },
});
