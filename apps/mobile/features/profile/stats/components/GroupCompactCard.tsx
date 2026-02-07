// features/profile/stats/components/GroupCompactCard.tsx
// Compact pressable card for a single group.

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
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
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.header}>
        <AppText variant="body" numberOfLines={1} style={styles.name}>
          {groupName}
        </AppText>
        <View
          style={[
            styles.statusBadge,
            {
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
  container: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  name: {
    flex: 1,
    fontWeight: "600",
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
