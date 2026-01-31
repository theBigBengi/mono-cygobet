// features/groups/group-lobby/components/CollapsibleSection.tsx
// Reusable collapsible card for draft settings (scoring, prediction mode, round mode).
// Closed: title + selectionLabel + chevron. Expanded: title + description + children + chevron.

import React, { useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Card, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";

export interface CollapsibleSectionProps {
  /** Section title */
  title: string;
  /** Shown when collapsed (current selection summary) */
  selectionLabel: string;
  /** Shown when expanded, above children */
  description?: string;
  /** Content when expanded */
  children: React.ReactNode;
  /** Initial expanded state. Default false. */
  defaultExpanded?: boolean;
}

export function CollapsibleSection({
  title,
  selectionLabel,
  description,
  children,
  defaultExpanded = false,
}: CollapsibleSectionProps) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Card style={styles.section}>
      <Pressable
        onPress={() => setExpanded((e) => !e)}
        style={({ pressed }) => [
          styles.headerRow,
          { opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <View style={styles.headerContent}>
          <AppText variant="body" style={styles.title}>
            {title}
          </AppText>
          {!expanded && (
            <AppText variant="caption" color="secondary" style={styles.selectionLabel}>
              {selectionLabel}
            </AppText>
          )}
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={theme.colors.textSecondary}
        />
      </Pressable>
      {expanded && (
        <View style={styles.expandedContent}>
          {description != null && description !== "" && (
            <AppText variant="caption" color="secondary" style={styles.description}>
              {description}
            </AppText>
          )}
          {children}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontWeight: "600",
    marginBottom: 4,
  },
  selectionLabel: {
    lineHeight: 18,
  },
  expandedContent: {
    marginTop: 8,
  },
  description: {
    marginBottom: 16,
    lineHeight: 18,
  },
});
