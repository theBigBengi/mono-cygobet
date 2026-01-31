import React from "react";
import { View, StyleSheet } from "react-native";
import { Card, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { ApiGroupStatus } from "@repo/types";

interface GroupLobbyStatusCardProps {
  /**
   * Current group status
   */
  status: ApiGroupStatus;
  /**
   * Whether the current user is the creator
   */
  isCreator: boolean;
}

/**
 * Component for displaying group status badge and message.
 * Handles different status states (draft, active, ended).
 */
export function GroupLobbyStatusCard({
  status,
  isCreator,
}: GroupLobbyStatusCardProps) {
  const { theme } = useTheme();

  // Only show status card for draft groups
  if (status !== "draft") {
    return null;
  }

  return (
    <Card style={styles.section}>
      <View style={styles.statusHeader}>
        <AppText variant="body" style={styles.statusTitle}>
          Finish setup the group 
        </AppText>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <AppText variant="caption" style={styles.badgeText}>
            Draft
          </AppText>
        </View>
      </View>
      <AppText
        variant="caption"
        color="secondary"
        style={styles.statusSubtitle}
      >
       Set group rules and publish the group to start.
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  statusTitle: {
    fontWeight: "600",
    flex: 1,
  },
  statusSubtitle: {
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontWeight: "600",
    textTransform: "uppercase",
  },
});
