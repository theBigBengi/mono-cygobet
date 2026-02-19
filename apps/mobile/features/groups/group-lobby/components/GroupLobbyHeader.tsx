// features/groups/group-lobby/components/GroupLobbyHeader.tsx
// Game HUD style header for lobby screen with integrated navigation.

import React from "react";
import { View, StyleSheet, Text, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Card, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { ApiGroupStatus, ApiGroupPrivacy } from "@repo/types";

interface GroupLobbyHeaderProps {
  name: string;
  memberCount?: number;
  status: ApiGroupStatus;
  privacy?: ApiGroupPrivacy;
  /** When true: HUD style with integrated nav */
  compact?: boolean;
  /** Future: group image URL */
  image?: string | null;
  /** When provided, shows info icon; onPress opens group info sheet */
  onInfoPress?: () => void;
  /** When provided, shows back button */
  onBack?: () => void;
  /** When provided, shows settings icon */
  onSettingsPress?: () => void;
  /** When true, hides nav buttons (used with external sticky header) */
  hideNavButtons?: boolean;
}

function getInitials(name: string): string {
  if (!name || !name.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2);
  }
  return name.slice(0, 2).toUpperCase();
}

export function GroupLobbyHeader({
  name,
  memberCount,
  status,
  privacy,
  compact = false,
  image: _image,
  onInfoPress,
  onBack,
  onSettingsPress,
  hideNavButtons = false,
}: GroupLobbyHeaderProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const initials = getInitials(name);

  const STATUS_LABELS: Record<ApiGroupStatus, string> = {
    draft: t("lobby.draft"),
    active: t("lobby.active"),
    ended: t("lobby.ended"),
  };

  const statusLabel = STATUS_LABELS[status] ?? status;

  const statusColor =
    status === "active"
      ? theme.colors.primary
      : status === "ended"
        ? theme.colors.textSecondary
        : theme.colors.warning;

  // HUD Style (compact mode)
  if (compact) {
    return (
      <View style={styles.hudContainer}>

        {/* Back Button - Positioned absolutely */}
        {!hideNavButtons && onBack && (
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.navButtonPressed,
            ]}
          >
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.background + "90" }]}>
              <Ionicons name="chevron-back" size={22} color={theme.colors.textPrimary} />
            </View>
          </Pressable>
        )}

        {/* Right Icons - Positioned absolutely */}
        {!hideNavButtons && (
          <View style={styles.rightIcons}>
            {onInfoPress && (
              <Pressable
                onPress={onInfoPress}
                style={({ pressed }) => [pressed && styles.navButtonPressed]}
              >
                <View style={[styles.iconCircle, { backgroundColor: theme.colors.background + "90" }]}>
                  <Ionicons name="information-circle-outline" size={22} color={theme.colors.textPrimary} />
                </View>
              </Pressable>
            )}
            {onSettingsPress && (
              <Pressable
                onPress={onSettingsPress}
                style={({ pressed }) => [pressed && styles.navButtonPressed]}
              >
                <View style={[styles.iconCircle, { backgroundColor: theme.colors.background + "90" }]}>
                  <Ionicons name="settings-outline" size={20} color={theme.colors.textPrimary} />
                </View>
              </Pressable>
            )}
          </View>
        )}

        {/* Main Content */}
        <View style={styles.hudContent}>
          {/* Shield/Badge with Avatar */}
          <Pressable
            style={styles.shieldContainer}
            onPress={onInfoPress}
            disabled={!onInfoPress}
          >
            <View
              style={[
                styles.shield,
                {
                  backgroundColor: theme.colors.primary,
                  shadowColor: "#000",
                },
              ]}
            >
              <Text style={[styles.shieldInitials, { color: theme.colors.primaryText }]}>
                {initials}
              </Text>
            </View>
            {/* Info badge */}
            {onInfoPress && (
              <View style={[styles.infoBadge, { backgroundColor: theme.colors.background }]}>
                <Ionicons name="information-circle" size={18} color={theme.colors.primary} />
              </View>
            )}
          </Pressable>

          {/* Name */}
          <Text
            style={[styles.hudName, { color: theme.colors.textPrimary }]}
            numberOfLines={2}
          >
            {name}
          </Text>

          {/* Stats Row */}
          <View style={styles.hudStats}>
            {/* Status */}
            <View style={[styles.hudStatPill, { backgroundColor: statusColor + "15", borderColor: statusColor + "30" }]}>
              <View style={[styles.hudStatusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.hudStatText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </View>

            <Text style={[styles.hudDivider, { color: theme.colors.border }]}>•</Text>

            {/* Members */}
            {memberCount != null && (
              <>
                <Ionicons name="people" size={14} color={theme.colors.textSecondary} />
                <Text style={[styles.hudStatValue, { color: theme.colors.textSecondary }]}>
                  {memberCount}
                </Text>
              </>
            )}

            {privacy && (
              <>
                <Text style={[styles.hudDivider, { color: theme.colors.border }]}>•</Text>
                <Ionicons
                  name={privacy === "public" ? "globe-outline" : "lock-closed-outline"}
                  size={14}
                  color={theme.colors.textSecondary}
                />
              </>
            )}
          </View>
        </View>
      </View>
    );
  }

  // Original non-compact style
  return (
    <Card style={styles.card}>
      <View style={styles.container}>
        <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
          <AppText variant="title" style={[styles.initials, { color: theme.colors.primaryText }]}>
            {initials}
          </AppText>
        </View>
        <View style={styles.textContainer}>
          <AppText variant="title" style={styles.name} numberOfLines={2}>
            {name}
          </AppText>
          <AppText variant="caption" color="secondary">
            {memberCount != null ? t("groups.members", { count: memberCount }) : ""}
          </AppText>
          <AppText variant="caption" style={{ color: statusColor }}>
            {statusLabel}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  // HUD Styles
  hudContainer: {
    paddingBottom: 12,
    position: "relative",
  },
  hudGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  backButton: {
    position: "absolute",
    left: 12,
    top: 8,
    zIndex: 10,
  },
  rightIcons: {
    position: "absolute",
    right: 12,
    top: 8,
    flexDirection: "row",
    gap: 8,
    zIndex: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  navButtonPressed: {
    opacity: 0.6,
  },
  hudContent: {
    alignItems: "center",
    paddingHorizontal: 48,
    paddingTop: 52,
  },
  shieldContainer: {
    marginBottom: 12,
    position: "relative",
  },
  infoBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  shield: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderBottomWidth: 4,
    borderBottomColor: "rgba(0,0,0,0.15)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  shieldInitials: {
    fontWeight: "800",
    fontSize: 24,
  },
  hudName: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  hudStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  hudStatPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderBottomWidth: 2,
  },
  hudStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  hudStatText: {
    fontSize: 12,
    fontWeight: "600",
  },
  hudStatValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  hudDivider: {
    fontSize: 10,
  },
  // Original Styles
  card: {
    marginBottom: 16,
  },
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  initials: {
    fontWeight: "700",
    fontSize: 32,
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontWeight: "700",
    fontSize: 18,
    marginBottom: 4,
  },
});
