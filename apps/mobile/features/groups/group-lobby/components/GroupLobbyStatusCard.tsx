// features/groups/group-lobby/components/GroupLobbyStatusCard.tsx
// Card shown at top of draft lobby: title, subtitle, DRAFT badge.

import React from "react";
import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { getShadowStyle } from "@/lib/theme/shadows";

interface GroupLobbyStatusCardProps {
  status: string;
  isCreator: boolean;
}

export function GroupLobbyStatusCard({ status }: GroupLobbyStatusCardProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.cardBackground,
        },
      ]}
    >
      <View style={[styles.badge, { backgroundColor: theme.colors.textPrimary + "08" }]}>
        <AppText variant="caption" style={styles.badgeText}>
          {t("lobby.draftBadge")}
        </AppText>
      </View>
      <AppText variant="subtitle" style={styles.title}>
        {t("lobby.defaultGroupName")}
      </AppText>
      <AppText variant="caption" color="secondary" style={styles.subtitle}>
        {t("lobby.finishSetupDescription")}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 20,
    marginBottom: 24,
    ...getShadowStyle("sm"),
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 12,
  },
  badgeText: {
    fontWeight: "600",
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    lineHeight: 20,
  },
});
