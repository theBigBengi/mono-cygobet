// features/profile/stats/components/GroupCompactCard.tsx
// Compact pressable card for a single group.

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { getShadowStyle } from "@/lib/theme/shadows";
import { useTranslation } from "react-i18next";

interface GroupCompactCardProps {
  groupId: number;
  groupName: string;
  rank: number;
  totalPoints: number;
  status: "active" | "ended";
  onPress: () => void;
}

export function GroupCompactCard({
  groupId,
  groupName,
  rank,
  totalPoints,
  status,
  onPress,
}: GroupCompactCardProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  const isActive = status === "active";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: pressed ? theme.colors.border : theme.colors.surface,
          borderRadius: theme.radius.md,
          padding: theme.spacing.ms,
          marginBottom: theme.spacing.sm,
          ...getShadowStyle("sm"),
        },
      ]}
    >
      <View style={[styles.header, { marginBottom: theme.spacing.xs }]}>
        <AppText variant="body" numberOfLines={1} style={[styles.name, { marginEnd: theme.spacing.sm }]}>
          {groupName}
        </AppText>
        <View
          style={[
            styles.statusBadge,
            {
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.xxs,
              borderRadius: theme.radius.xs,
              backgroundColor: isActive
                ? theme.colors.success + "20"
                : theme.colors.textSecondary + "20",
            },
          ]}
        >
          <AppText
            variant="caption"
            style={{
              color: isActive
                ? theme.colors.success
                : theme.colors.textSecondary,
              fontWeight: "600",
            }}
          >
            {isActive ? t("profile.active") : t("profile.ended")}
          </AppText>
        </View>
      </View>
      <AppText variant="caption" color="secondary">
        #{rank} · {totalPoints} {t("predictions.pts")}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {},
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  name: {
    flex: 1,
    fontWeight: "600",
  },
  statusBadge: {},
});
