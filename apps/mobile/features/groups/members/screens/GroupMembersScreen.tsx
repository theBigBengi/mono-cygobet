// features/groups/members/screens/GroupMembersScreen.tsx
// Group members list — flat, minimal design.

import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { AppText } from "@/components/ui";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import { useGroupMembersQuery } from "@/domains/groups";
import { useAuth } from "@/lib/auth/useAuth";
import { useTheme } from "@/lib/theme";
import type { ApiGroupMemberItem } from "@repo/types";
import { formatDate } from "@/utils/date";

interface GroupMembersScreenProps {
  groupId: number | null;
}

const ROLE_ICON: Record<string, string> = {
  owner: "shield",
  admin: "shield-half-outline",
};

const MemberRow = React.memo(function MemberRow({
  item,
  isCurrentUser,
  index,
  groupId,
}: {
  item: ApiGroupMemberItem;
  isCurrentUser: boolean;
  index: number;
  groupId: number | null;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation("common");
  const router = useRouter();

  const displayName = item.username ?? `Player #${index + 1}`;
  const joinedAtFormatted = item.joinedAt ? formatDate(item.joinedAt) : "";
  const roleIcon = ROLE_ICON[item.role];

  const onPress = () => {
    if (groupId != null && item.userId) {
      router.push(
        `/groups/${groupId}/member/${item.userId}?username=${encodeURIComponent(displayName)}` as Href
      );
    }
  };

  return (
    <Pressable
      onPress={groupId != null ? onPress : undefined}
      style={({ pressed }) => [
        styles.memberRow,
        {
          backgroundColor: isCurrentUser
            ? theme.colors.textPrimary + "06"
            : "transparent",
          borderBottomColor: theme.colors.border,
        },
        pressed && { opacity: 0.7 },
      ]}
    >
      {/* Rank number */}
      <View style={styles.indexCol}>
        <AppText
          variant="caption"
          style={[styles.indexText, { color: theme.colors.textSecondary }]}
        >
          {index + 1}
        </AppText>
      </View>

      {/* Name + joined date */}
      <View style={styles.infoCol}>
        <View style={styles.nameRow}>
          <AppText
            variant="body"
            numberOfLines={1}
            style={[
              styles.username,
              { color: theme.colors.textPrimary },
              isCurrentUser && { fontWeight: "700" },
            ]}
          >
            {displayName}
          </AppText>
          {roleIcon && (
            <Ionicons
              name={roleIcon as any}
              size={14}
              color={theme.colors.primary}
              style={styles.roleIcon}
            />
          )}
        </View>
        {joinedAtFormatted ? (
          <AppText
            variant="caption"
            style={[styles.joinedText, { color: theme.colors.textSecondary }]}
          >
            {t("members.joined", { date: joinedAtFormatted })}
          </AppText>
        ) : null}
      </View>

      {/* Chevron */}
      <Ionicons
        name="chevron-forward"
        size={16}
        color={theme.colors.textSecondary}
      />
    </Pressable>
  );
});

export function GroupMembersScreen({ groupId }: GroupMembersScreenProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const { user } = useAuth();
  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useGroupMembersQuery(groupId);

  const renderMemberItem = useCallback(
    ({ item, index }: { item: ApiGroupMemberItem; index: number }) => (
      <MemberRow
        item={item}
        isCurrentUser={user?.id != null && item.userId === user.id}
        index={index}
        groupId={groupId}
      />
    ),
    [user?.id, groupId],
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <QueryLoadingView message={t("members.loadingMembers")} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centered}>
        <QueryErrorView
          message={t("members.failedLoadMembers")}
          onRetry={() => refetch()}
        />
      </View>
    );
  }

  const items = data.data;

  return (
    <View style={styles.container}>
      {/* Member count */}
      <View style={[styles.countRow, { borderBottomColor: theme.colors.border }]}>
        <AppText variant="caption" style={{ color: theme.colors.textSecondary }}>
          {t("members.count", { count: items.length })}
        </AppText>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.userId)}
        removeClippedSubviews={Platform.OS === "android"}
        maxToRenderPerBatch={10}
        initialNumToRender={10}
        windowSize={5}
        renderItem={renderMemberItem}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={theme.colors.primary}
            colors={Platform.OS === "android" ? [theme.colors.primary] : undefined}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  countRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  indexCol: {
    width: 28,
  },
  indexText: {
    fontSize: 13,
    fontWeight: "600",
  },
  infoCol: {
    flex: 1,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  username: {
    fontSize: 15,
    fontWeight: "500",
  },
  roleIcon: {
    marginLeft: 6,
  },
  joinedText: {
    fontSize: 12,
    marginTop: 2,
  },
});
