import React from "react";
import { View, StyleSheet } from "react-native";
import { Card, AppText } from "@/components/ui";
import { formatDate } from "@/utils";

interface GroupLobbyMetaSectionProps {
  /**
   * Creation date of the group (ISO string)
   */
  createdAt: string;
}

/**
 * Component for displaying group metadata (creation date).
 * Simple display component with minimal styling.
 */
export function GroupLobbyMetaSection({
  createdAt,
}: GroupLobbyMetaSectionProps) {
  return (
    <Card style={styles.section}>
      <View style={styles.metaRow}>
        <AppText variant="body" color="secondary">
          Created:
        </AppText>
        <AppText variant="body" style={styles.metaValue}>
          {formatDate(createdAt)}
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 0,
  },
  metaValue: {
    fontWeight: "500",
  },
});
