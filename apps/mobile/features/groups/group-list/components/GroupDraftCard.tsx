// features/groups/group-list/components/GroupDraftCard.tsx
// Card component for displaying draft groups in the groups list.

import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable } from "react-native";
import { AppText, Card } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { formatDate } from "@/utils";
import { formatKickoffDate, formatKickoffTime } from "@/utils/fixture";
import type { ApiGroupItem } from "@repo/types";

interface GroupDraftCardProps {
  group: ApiGroupItem;
  onPress: () => void;
}

export function GroupDraftCard({ group, onPress }: GroupDraftCardProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  const getStatusBadgeColor = () => {
    return theme.colors.surface;
  };

  const getStatusTextColor = () => {
    return theme.colors.textSecondary;
  };

  return (
    <Pressable onPress={onPress}>
      <Card style={styles.groupCard}>
        <View style={styles.groupHeader}>
          <AppText variant="body" style={styles.groupName}>
            {group.name}
          </AppText>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: getStatusBadgeColor(),
                borderColor: theme.colors.border,
              },
            ]}
          >
            <AppText
              variant="caption"
              style={[styles.statusBadgeText, { color: getStatusTextColor() }]}
            >
              {t(`lobby.${group.status}`)}
            </AppText>
          </View>
        </View>

        <View style={styles.groupMeta}>
          <AppText variant="caption" color="secondary" style={styles.groupDate}>
            {formatDate(group.createdAt)}
          </AppText>
        </View>

        {group.firstGame && (
          <View
            style={[
              styles.groupInfo,
              {
                borderTopColor: theme.colors.border,
              },
            ]}
          >
            <AppText variant="caption" color="secondary" style={styles.infoItem}>
              {t("lobby.groupStart", {
              date: formatKickoffDate(group.firstGame.kickoffAt),
              time: formatKickoffTime(group.firstGame.kickoffAt),
            })}
            </AppText>
          </View>
        )}
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
    marginBottom: 8,
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  groupDate: {
    marginStart: 8,
  },
  groupInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  infoItem: {
    marginBottom: 4,
  },
});
