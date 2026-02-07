import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Switch } from "react-native";
import { Card, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { ApiGroupPrivacy, ApiGroupStatus } from "@repo/types";

interface GroupLobbyPrivacySectionProps {
  /**
   * Current privacy setting
   */
  privacy: ApiGroupPrivacy;
  /**
   * Callback when privacy changes
   */
  onChange: (privacy: ApiGroupPrivacy) => void;
  /**
   * Whether the toggle is disabled
   */
  disabled: boolean;
  /**
   * Whether the current user is the creator
   */
  isCreator: boolean;
  /**
   * Current group status - only show privacy section in draft mode
   */
  status: ApiGroupStatus;
  /**
   * When true, render content without Card wrapper and without marginBottom
   */
  noCard?: boolean;
}

/**
 * Component for displaying and editing group privacy setting.
 * Only renders if isCreator is true and status is "draft".
 * Shows toggle with helper text explaining the privacy setting.
 */
export function GroupLobbyPrivacySection({
  privacy,
  onChange,
  disabled,
  isCreator,
  status,
  noCard = false,
}: GroupLobbyPrivacySectionProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  // Only show privacy section for creators in draft mode
  if (!isCreator || status !== "draft") {
    return null;
  }

  const content = (
    <View style={styles.privacyRow}>
      <View style={styles.privacyLabelContainer}>
        <AppText variant="body" style={styles.privacyLabel}>
          {t("lobby.privacy")}
        </AppText>
        <AppText
          variant="caption"
          color="secondary"
          style={styles.privacyHelperText}
        >
          {privacy === "private"
            ? t("lobby.onlyInvitedCanJoin")
            : t("lobby.anyoneCanJoin")}
        </AppText>
      </View>
      <Switch
        value={privacy === "public"}
        onValueChange={(value) => onChange(value ? "public" : "private")}
        disabled={disabled}
        trackColor={{
          false: theme.colors.border,
          true: theme.colors.primary,
        }}
        thumbColor={
          privacy === "public" ? theme.colors.primaryText : theme.colors.surface
        }
      />
    </View>
  );

  if (noCard) {
    return <View>{content}</View>;
  }

  return <Card style={styles.section}>{content}</Card>;
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  privacyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  privacyLabelContainer: {
    flex: 1,
    marginEnd: 16,
  },
  privacyLabel: {
    fontWeight: "600",
    marginBottom: 4,
  },
  privacyHelperText: {
    marginTop: 0,
  },
});
