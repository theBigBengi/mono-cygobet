// features/groups/group-lobby/components/GroupLobbyHeader.tsx
// Game HUD style header for lobby screen with integrated navigation.

import React, { useEffect } from "react";
import { View, StyleSheet, Text, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons, FontAwesome6 } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Card, AppText, GroupAvatar } from "@/components/ui";
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
  /** Avatar type for gradient/emoji/image */
  avatarType?: string | null;
  /** Avatar value (gradient index, emoji, image url) */
  avatarValue?: string | null;
  /** When provided, shows info icon; onPress opens group info sheet */
  onInfoPress?: () => void;
  /** When provided, shows back button */
  onBack?: () => void;
  /** When provided, shows settings icon */
  onSettingsPress?: () => void;
  /** When true, hides nav buttons (used with external sticky header) */
  hideNavButtons?: boolean;
  /** Whether this is an official group */
  isOfficial?: boolean;
  /** Creator username to display below group name */
  creatorName?: string | null;
  /** Share/invite button press */
  onSharePress?: () => void;
  /** Show skeleton loading state */
  isLoading?: boolean;
}

function getInitials(name: string): string {
  if (!name || !name.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2);
  }
  return name.slice(0, 2).toUpperCase();
}

function GroupLobbyHeaderInner({
  name,
  memberCount,
  status,
  privacy,
  compact = false,
  image: _image,
  avatarType,
  avatarValue,
  onInfoPress,
  onBack,
  onSettingsPress,
  hideNavButtons = false,
  isOfficial = false,
  creatorName,
  onSharePress,
  isLoading = false,
}: GroupLobbyHeaderProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const initials = getInitials(name);

  const skeletonOpacity = useSharedValue(0.3);

  useEffect(() => {
    if (isLoading) {
      skeletonOpacity.value = withRepeat(
        withTiming(1, { duration: 800 }),
        -1,
        true
      );
    }
  }, [isLoading, skeletonOpacity]);

  const skeletonStyle = useAnimatedStyle(() => ({
    opacity: skeletonOpacity.value,
  }));

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

        {/* Avatar — centered */}
        {isLoading ? (
          <Animated.View
            style={[
              styles.avatarCenter,
              styles.skeletonAvatar,
              { backgroundColor: theme.colors.border },
              skeletonStyle,
            ]}
          />
        ) : (
          <Pressable
            style={styles.avatarCenter}
            onPress={onInfoPress}
            disabled={!onInfoPress}
          >
            <GroupAvatar
              avatarType={avatarType}
              avatarValue={avatarValue}
              initials={initials}
              size={120}
              borderRadius={20}
              flat
            />
          </Pressable>
        )}

        {/* Name + creator + share */}
        <View style={styles.hudTextBelow}>
          {isLoading ? (
            <View style={styles.hudTitleLeft}>
              <Animated.View
                style={[
                  styles.skeletonBar,
                  { width: 160, height: 14, backgroundColor: theme.colors.border },
                  skeletonStyle,
                ]}
              />
              <Animated.View
                style={[
                  styles.skeletonBar,
                  { width: 100, height: 12, marginTop: 8, backgroundColor: theme.colors.border },
                  skeletonStyle,
                ]}
              />
            </View>
          ) : (
            <View style={styles.hudTitleRow}>
              <View style={styles.hudTitleLeft}>
                <View style={styles.hudNameRow}>
                  {isOfficial && (
                    <View style={styles.officialBadge}>
                      <Ionicons name="shield-checkmark" size={16} color="#D4A017" />
                    </View>
                  )}
                  <Text
                    style={[styles.hudName, { color: theme.colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {name}
                  </Text>
                </View>

                {creatorName && (
                  <View style={styles.creatorRow}>
                    <View style={[styles.creatorAvatar, { backgroundColor: theme.colors.textPrimary + "15" }]}>
                      <Text style={[styles.creatorInitial, { color: theme.colors.textPrimary }]}>
                        {creatorName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.creatorText, { color: theme.colors.textSecondary }]}>
                      {creatorName}
                    </Text>
                  </View>
                )}
              </View>

              {onSharePress && (
                <Pressable
                  onPress={onSharePress}
                  style={({ pressed }) => [
                    styles.shareButton,
                    { borderColor: theme.colors.textPrimary },
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <FontAwesome6 name="share" size={16} color={theme.colors.textPrimary} />
                </Pressable>
              )}
            </View>
          )}

        </View>
      </View>
    );
  }

  // Original non-compact style
  return (
    <Card style={styles.card}>
      <View style={styles.container}>
        <GroupAvatar
          avatarType={avatarType}
          avatarValue={avatarValue}
          initials={initials}
          size={80}
          borderRadius={14}
        />
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

export const GroupLobbyHeader = React.memo(GroupLobbyHeaderInner);

const styles = StyleSheet.create({
  // HUD Styles
  hudContainer: {
    paddingBottom: 8,
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
  avatarCenter: {
    alignSelf: "center",
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  hudTextBelow: {
    paddingHorizontal: 16,
  },
  hudTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hudTitleLeft: {
    flex: 1,
    marginRight: 12,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    marginBottom: 6,
  },
  creatorAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  creatorInitial: {
    fontSize: 10,
    fontWeight: "700",
  },
  creatorText: {
    fontSize: 13,
    fontWeight: "500",
  },
  hudNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  officialBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#D4A01720",
    alignItems: "center",
    justifyContent: "center",
  },
  hudName: {
    fontSize: 22,
    fontWeight: "700",
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
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontWeight: "700",
    fontSize: 18,
    marginBottom: 4,
  },
  skeletonAvatar: {
    width: 120,
    height: 120,
    borderRadius: 20,
    alignSelf: "center",
    marginBottom: 32,
  },
  skeletonBar: {
    borderRadius: 6,
  },
});
