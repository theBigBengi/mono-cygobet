import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Switch } from "react-native";
import { Card, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { ApiInviteAccess, ApiGroupStatus } from "@repo/types";

interface GroupLobbyInviteAccessSectionProps {
  /**
   * Current invite access setting
   */
  inviteAccess: ApiInviteAccess;
  /**
   * Callback when invite access changes
   */
  onChange: (inviteAccess: ApiInviteAccess) => void;
  /**
   * Whether the toggle is disabled
   */
  disabled: boolean;
  /**
   * Whether the current user is the creator
   */
  isCreator: boolean;
  /**
   * Current group status - only show section in draft mode
   */
  status: ApiGroupStatus;
}

/**
 * Component for displaying and editing group invite access setting.
 * Only renders if isCreator is true and status is "draft".
 * Switch direction matches Privacy: ON = more open (all can share), OFF = restricted (admins only).
 */
export function GroupLobbyInviteAccessSection({
  inviteAccess,
  onChange,
  disabled,
  isCreator,
  status,
}: GroupLobbyInviteAccessSectionProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  // Only show invite access section for creators in draft mode
  if (!isCreator || status !== "draft") {
    return null;
  }

  const helperText =
    inviteAccess === "all"
      ? "All members can share invite link"
      : "Only admins can share invite link";

  // ON = "all" (open), OFF = "admin_only" (restricted) — same mental model as Privacy toggle
  const switchOn = inviteAccess === "all";

  return (
    <Card style={styles.section}>
      <View style={styles.row}>
        <View style={styles.labelContainer}>
          <AppText variant="body" style={styles.label}>
            {t("lobby.inviteSharing")}
          </AppText>
          <AppText variant="caption" color="secondary" style={styles.helperText}>
            {helperText}
          </AppText>
        </View>
        <Switch
          value={switchOn}
          onValueChange={(value) => onChange(value ? "all" : "admin_only")}
          disabled={disabled}
          trackColor={{
            false: theme.colors.border,
            true: theme.colors.primary,
          }}
          thumbColor={
            switchOn ? theme.colors.primaryText : theme.colors.surface
          }
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  labelContainer: {
    flex: 1,
    marginEnd: 16,
  },
  label: {
    fontWeight: "600",
    marginBottom: 4,
  },
  helperText: {
    marginTop: 0,
  },
});
