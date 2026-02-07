// features/groups/group-list/components/MemberCountBadge.tsx
// Colored circles representing members + count (no avatars from API).

import React from "react";
import { View, StyleSheet } from "react-native";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";

const AVATAR_COLORS = ["#007AFF", "#34C759", "#FF9500", "#AF52DE"];

export type MemberCountBadgeProps = {
  count: number;
  maxVisible?: number;
  size?: number;
};

/**
 * Shows overlapping colored circles (placeholder avatars) + member count.
 * Example: 🔵🟢🟡 +5
 */
export function MemberCountBadge({
  count,
  maxVisible = 3,
  size = 20,
}: MemberCountBadgeProps) {
  const { theme } = useTheme();
  const visible = Math.min(maxVisible, Math.max(0, count));

  return (
    <View style={[styles.row, { height: size }]}>
      {Array.from({ length: visible }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.circle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
              marginLeft: i === 0 ? 0 : -size * 0.4,
              borderWidth: 2,
              borderColor: theme.colors.surface,
            },
          ]}
        />
      ))}
      {count > visible && (
        <View style={styles.countWrap}>
          <AppText
            variant="caption"
            style={[styles.countText, { color: theme.colors.textPrimary }]}
          >
            +{count - visible}
          </AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  circle: {
    zIndex: 1,
  },
  countWrap: {
    marginLeft: 4,
    justifyContent: "center",
  },
  countText: {
    fontWeight: "600",
    fontSize: 11,
  },
});
