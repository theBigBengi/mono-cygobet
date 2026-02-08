// features/groups/group-lobby/components/GroupLobbyStatusCard.tsx
// Card shown at top of draft lobby: title, subtitle, DRAFT badge.

import React from "react";
import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";

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
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={[styles.badge, { borderColor: theme.colors.border }]}>
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
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 10,
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
