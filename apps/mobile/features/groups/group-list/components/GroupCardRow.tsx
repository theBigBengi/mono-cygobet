// features/groups/group-list/components/GroupCardRow.tsx
// Compact row view for groups list — shows avatar, name, subtitle, and key indicators.

import React, { useMemo } from "react";
import { View, Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { GroupAvatar } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { getInitials } from "@/utils/string";
import type { ApiGroupItem } from "@repo/types";

export interface GroupCardRowProps {
  group: ApiGroupItem;
  onPress: (groupId: number) => void;
}

const ROW_AVATAR_SIZE = 40;

function GroupCardRowInner({ group, onPress }: GroupCardRowProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  const initials = getInitials(group.name);
  const liveCount = group.liveGamesCount ?? 0;

  const subtitle = useMemo(() => {
    if (group.selectionMode === "leagues" && group.nextGame?.league) {
      return group.nextGame.league.name;
    }
    if (group.selectionMode === "teams" && group.groupTeams && group.groupTeams.length > 0) {
      return group.groupTeams.map((team) => team.shortCode ?? team.name).join(", ");
    }
    if (group.selectionMode === "games" && (group.totalFixtures ?? 0) > 0) {
      return t("groups.freePick");
    }
    return `${group.memberCount ?? 0} ${t("groups.membersShort").toLowerCase()}`;
  }, [group, t]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(group.id);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed
            ? theme.colors.border + "40"
            : "transparent",
          gap: theme.spacing.ms,
          paddingHorizontal: theme.spacing.md,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={group.name}
    >
      <GroupAvatar
        avatarType={group.avatarType}
        avatarValue={group.avatarValue}
        initials={initials}
        size={ROW_AVATAR_SIZE}
        borderRadius={theme.radius.sm}
      />

      <View style={styles.textBlock}>
        <View style={styles.nameRow}>
          <Text
            style={[styles.name, { color: theme.colors.textPrimary }]}
            numberOfLines={1}
          >
            {group.name}
          </Text>
          {group.isOfficial && (
            <Ionicons name="shield-checkmark" size={12} color="#D4A017" />
          )}
        </View>
        <Text
          style={[styles.subtitle, { color: theme.colors.textSecondary }]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      </View>

      {/* Right indicators */}
      <View style={styles.indicators}>
        {liveCount > 0 && (
          <View style={[styles.liveDot, { backgroundColor: theme.colors.danger, borderRadius: theme.radius.full }]} />
        )}
      </View>
    </Pressable>
  );
}

export const GroupCardRow = React.memo(GroupCardRowInner, (prev, next) => {
  return prev.group === next.group && prev.onPress === next.onPress;
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    // gap, paddingHorizontal — applied inline via theme tokens
    paddingVertical: 10,
  },
  textBlock: {
    flex: 1,
    gap: 2, // theme.spacing.xxs
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4, // theme.spacing.xs
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    flexShrink: 1,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "400",
  },
  indicators: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveDot: {
    width: 8, // theme.spacing.sm
    height: 8, // theme.spacing.sm
    // borderRadius: theme.radius.full — applied inline
  },
});
