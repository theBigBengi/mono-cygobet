// features/groups/group-list/components/GroupDraftCard.tsx
// Card component for displaying draft groups in the groups list.

import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText, Card } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { formatDate } from "@/utils";
import type { ApiGroupItem } from "@repo/types";

interface GroupDraftCardProps {
  group: ApiGroupItem;
  onPress: () => void;
}

export function GroupDraftCard({ group, onPress }: GroupDraftCardProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  const fixturesCount = Array.isArray((group as any).fixtures)
    ? (group as any).fixtures.length
    : 0;

  return (
    <Pressable onPress={onPress}>
      <Card
        style={[
          styles.groupCard,
          {
            borderStyle: "dashed",
            borderColor: theme.colors.border,
            borderWidth: 1.5,
          },
        ]}
      >
        <View style={styles.groupHeader}>
          <AppText variant="body" style={styles.groupName} numberOfLines={1}>
            {group.name}
          </AppText>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <AppText
              variant="caption"
              style={[
                styles.statusBadgeText,
                { color: theme.colors.textSecondary },
              ]}
            >
              {t(`lobby.${group.status}`)}
            </AppText>
          </View>
        </View>

        <View
          style={[styles.groupMeta, { borderTopColor: theme.colors.border }]}
        >
          <View style={styles.metaRow}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color={theme.colors.textSecondary}
              style={styles.icon}
            />
            <AppText variant="caption" color="secondary">
              {t("lobby.createdOn", { date: formatDate(group.createdAt) })}
            </AppText>
          </View>
          {fixturesCount > 0 && (
            <View style={styles.metaRow}>
              <Ionicons
                name="game-controller-outline"
                size={14}
                color={theme.colors.textSecondary}
                style={styles.icon}
              />
              <AppText variant="caption" color="secondary">
                {t("lobby.gamesSelectedCount", { count: fixturesCount })}
              </AppText>
            </View>
          )}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  groupCard: {
    marginBottom: 12,
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  groupName: {
    flex: 1,
    fontWeight: "600",
    marginEnd: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontWeight: "600",
    fontSize: 10,
  },
  groupMeta: {
    paddingTop: 10,
    borderTopWidth: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  icon: {
    marginEnd: 6,
  },
});
