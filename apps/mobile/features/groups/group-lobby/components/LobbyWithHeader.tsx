// features/groups/group-lobby/components/LobbyWithHeader.tsx
// Wrapper component for group lobby screens with header.
// Provides consistent header layout with status badge and optional group name.

import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable } from "react-native";
import { AppText } from "@/components/ui";
import { useGoBack } from "@/hooks/useGoBack";
import { useTheme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { GroupGamesHeader } from "@/features/groups/predictions/components/GroupGamesHeader";
import type { ApiGroupStatus } from "@repo/types";

const HEADER_HEIGHT = 64;

interface LobbyWithHeaderProps {
  children: React.ReactNode;
  status: ApiGroupStatus | string;
  groupName?: string;
  /** For draft status: when provided, shows trash icon instead of "Draft" badge; icon triggers delete */
  onDeleteGroup?: () => void;
  /** For draft status: whether delete is in progress (disables trash icon) */
  isDeleting?: boolean;
}

/**
 * LobbyWithHeader
 *
 * Wrapper component that provides a consistent header layout for group lobby screens.
 * Displays status badge and optionally the group name (for active groups).
 */
export function LobbyWithHeader({
  children,
  status,
  groupName,
  onDeleteGroup,
  isDeleting = false,
}: LobbyWithHeaderProps) {
  const { t } = useTranslation("common");
  const goBack = useGoBack("/(tabs)/groups");
  const { theme } = useTheme();

  const STATUS_LABELS: Record<ApiGroupStatus, string> = {
    draft: t("lobby.draft"),
    active: t("lobby.active"),
    ended: t("lobby.ended"),
  };

  const isActiveOrEnded = status === "active" || status === "ended";
  const isDraft = status === "draft";

  const statusLabel =
    status in STATUS_LABELS
      ? STATUS_LABELS[status as ApiGroupStatus]
      : (status as string);

  const hasBackground = !isActiveOrEnded && !onDeleteGroup;
  const backgroundColor =
    isDraft && !onDeleteGroup ? theme.colors.surface : undefined;
  const statusTextColor =
    isDraft && !onDeleteGroup
      ? theme.colors.textPrimary
      : theme.colors.textSecondary;

  const leftContent =
    isActiveOrEnded && groupName ? (
      <AppText
        variant="subtitle"
        style={[styles.groupNameText, { color: theme.colors.textPrimary }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {groupName}
      </AppText>
    ) : undefined;

  const rightContent =
    isDraft && onDeleteGroup ? (
      <Pressable
        onPress={onDeleteGroup}
        disabled={isDeleting}
        style={({ pressed }) => [pressed && styles.iconPressed]}
      >
        <View style={styles.settingsButton}>
          <Ionicons
            name="trash-outline"
            size={20}
            color={
              isDeleting ? theme.colors.textSecondary : theme.colors.danger
            }
          />
        </View>
      </Pressable>
    ) : !isActiveOrEnded ? (
      <View
        style={[
          styles.statusBadge,
          hasBackground && {
            backgroundColor,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 12,
          },
        ]}
      >
        <AppText
          variant="caption"
          color="secondary"
          style={[styles.statusBadgeText, { color: statusTextColor }]}
        >
          {statusLabel}
        </AppText>
      </View>
    ) : null;

  return (
    <View
      style={[
        styles.lobbyContainer,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <View style={[styles.lobbyContent, { paddingTop: HEADER_HEIGHT }]}>
        {children}
      </View>
      <View style={styles.headerOverlay} pointerEvents="box-none">
        <GroupGamesHeader
          backOnly
          onBack={goBack}
          leftContent={leftContent}
          rightContent={rightContent}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lobbyContainer: { flex: 1 },
  lobbyContent: { flex: 1 },
  headerOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 10,
  },
  statusBadge: {
    // Container for status badge
  },
  statusBadgeText: {
    fontWeight: "600",
    textTransform: "uppercase",
  },
  groupNameText: {
    fontWeight: "600",
    maxWidth: 200,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 99,
    justifyContent: "center",
    alignItems: "center",
  },
  iconPressed: {
    opacity: 0.6,
  },
});
