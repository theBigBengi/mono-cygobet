// features/profile/stats/components/ProfileHeader.tsx
// Avatar circle, username, level badge, daily streak.

import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet } from "react-native";
import { Card, AppText, Row } from "@/components/ui";
import { useTheme } from "@/lib/theme";

interface ProfileHeaderProps {
  username: string | null;
  image: string | null;
  level?: number;
  dailyStreak?: number;
}

function getInitials(username: string | null): string {
  if (!username || !username.trim()) return "?";
  const parts = username.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2);
  }
  return username.slice(0, 2).toUpperCase();
}

export function ProfileHeader({
  username,
  image,
  level = 1,
  dailyStreak = 0,
}: ProfileHeaderProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const initials = getInitials(username);

  return (
    <Card>
      <Row gap={theme.spacing.md} style={styles.row}>
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: theme.colors.primary,
              width: 56,
              height: 56,
              borderRadius: 28,
            },
          ]}
        >
          <AppText
            variant="title"
            style={[
              styles.initials,
              { color: theme.colors.primaryText },
            ]}
          >
            {initials}
          </AppText>
        </View>
        <View style={styles.info}>
          <AppText variant="title" numberOfLines={1}>
            {username || t("common.unknown")}
          </AppText>
          <View style={styles.badges}>
            <AppText variant="caption" color="secondary">
              Level {level}
            </AppText>
            <AppText variant="caption" color="secondary" style={styles.streak}>
              {dailyStreak} day streak
            </AppText>
          </View>
        </View>
      </Row>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    justifyContent: "flex-start",
    alignItems: "center",
  },
  avatar: {
    justifyContent: "center",
    alignItems: "center",
  },
  initials: {
    fontWeight: "600",
  },
  info: {
    flex: 1,
  },
  badges: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  streak: {
    marginStart: 8,
  },
});
