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
  const styles = createStyles(theme);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
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

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    card: {
      borderRadius: theme.radius.sm,
      padding: theme.spacing.ml,
      marginBottom: theme.spacing.lg,
      ...getShadowStyle("sm"),
    },
    badge: {
      alignSelf: "flex-start",
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 5,
      borderRadius: theme.radius.s,
      marginBottom: theme.spacing.ms,
    },
    badgeText: {
      fontWeight: "600",
    },
    title: {
      marginBottom: theme.spacing.xs,
    },
    subtitle: {
      lineHeight: 20,
    },
  });
