// features/groups/group-lobby/components/LobbyWithHeader.tsx
// Wrapper component for group lobby screens with header.
// Provides consistent header layout with status badge and optional group name.

import React, { useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { GroupGamesHeader } from "@/features/groups/predictions/components/GroupGamesHeader";
import { GroupSettingsModal } from "./GroupSettingsModal";
import type { ApiGroupStatus } from "@repo/types";

const HEADER_HEIGHT = 64;

const STATUS_LABELS: Record<ApiGroupStatus, string> = {
  draft: "Draft",
  active: "Active",
  ended: "Ended",
};

interface LobbyWithHeaderProps {
  children: React.ReactNode;
  status: ApiGroupStatus | string;
  groupName?: string;
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
}: LobbyWithHeaderProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const isActive = status === "active";
  const isDraft = status === "draft";
  
  const statusLabel =
    status in STATUS_LABELS
      ? STATUS_LABELS[status as ApiGroupStatus]
      : (status as string);
  
  const hasBackground = isActive || isDraft;
  const backgroundColor = isActive
    ? theme.colors.primary
    : isDraft
      ? theme.colors.surface
      : undefined;
  const statusTextColor = isActive
    ? theme.colors.primaryText
    : isDraft
      ? theme.colors.textPrimary
      : theme.colors.textSecondary;
  
  const leftContent =
    isActive && groupName ? (
      <AppText
        variant="subtitle"
        style={[styles.groupNameText, { color: theme.colors.textPrimary }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {groupName}
      </AppText>
    ) : undefined;

  const rightContent = isActive ? (
    <Pressable onPress={() => setIsSettingsModalVisible(true)}>
      <View style={styles.settingsButton}>
        <Ionicons
          name="options-outline"
          size={20}
          color={theme.colors.textPrimary}
        />
      </View>
    </Pressable>
  ) : (
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
  );
  
  return (
    <View
      style={[styles.lobbyContainer, { backgroundColor: theme.colors.background }]}
    >
      <View style={[styles.lobbyContent, { paddingTop: HEADER_HEIGHT }]}>
        {children}
      </View>
      <View style={styles.headerOverlay} pointerEvents="box-none">
        <GroupGamesHeader
          backOnly
          onBack={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              // If no screen to go back to (e.g., after creating group with replace),
              // navigate to groups tab
              router.replace("/(tabs)/groups" as any);
            }
          }}
          leftContent={leftContent}
          rightContent={rightContent}
        />
      </View>
      {isActive && (
        <GroupSettingsModal
          visible={isSettingsModalVisible}
          onClose={() => setIsSettingsModalVisible(false)}
        />
      )}
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
});
