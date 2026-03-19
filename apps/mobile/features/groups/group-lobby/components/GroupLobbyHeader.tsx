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
import { getInitials } from "@/utils/string";
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
  /** When provided, avatar tap opens edit sheet */
  onAvatarPress?: () => void;
  /** When provided, shows back button */
  onBack?: () => void;
  /** When provided, shows settings icon */
  onSettingsPress?: () => void;
  /** When true, hides nav buttons (used with external sticky header) */
  hideNavButtons?: boolean;
  /** Whether this is an official group */
  isOfficial?: boolean;
  /** Group description */
  description?: string | null;
  /** Creator username to display below group name */
  creatorName?: string | null;
  /** Share/invite button press */
  onSharePress?: () => void;
  /** Show skeleton loading state */
  isLoading?: boolean;
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
  onAvatarPress,
  onBack,
  onSettingsPress,
  hideNavButtons = false,
  isOfficial = false,
  description,
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
      <View style={[styles.hudContainer, { paddingBottom: theme.spacing.ms }]}>

        {/* Back Button - Positioned absolutely */}
        {!hideNavButtons && onBack && (
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.navButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.background + "90" }]}>
              <Ionicons name="chevron-back" size={22} color={theme.colors.textPrimary} />
            </View>
          </Pressable>
        )}

        {/* Right Icons - Positioned absolutely */}
        {!hideNavButtons && (
          <View style={styles.rightIcons}>
            {onSettingsPress && (
              <Pressable
                onPress={onSettingsPress}
                style={({ pressed }) => [pressed && styles.navButtonPressed]}
                accessibilityRole="button"
                accessibilityLabel="Group settings"
              >
                <View style={[styles.iconCircle, { backgroundColor: theme.colors.background + "90" }]}>
                  <Ionicons name="settings-outline" size={20} color={theme.colors.textPrimary} />
                </View>
              </Pressable>
            )}
          </View>
        )}

        {/* Avatar + meta chips — centered */}
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
          <View style={styles.avatarCenter}>
            <Pressable
              onPress={onAvatarPress}
              disabled={!onAvatarPress}
            >
              <GroupAvatar
                avatarType={avatarType}
                avatarValue={avatarValue}
                initials={initials}
                size={120}
                borderRadius={20}
                flat
              />
              {onAvatarPress && (
                <View style={[styles.avatarInfoHint, { backgroundColor: theme.colors.background }]}>
                  <Ionicons
                    name="color-palette-outline"
                    size={16}
                    color={theme.colors.textSecondary}
                  />
                </View>
              )}
            </Pressable>
          </View>
        )}

        {/* Name + creator + share */}
        <View style={styles.hudTextBelow}>
          {isLoading ? (
            <View style={styles.hudTitleLeft}>
              {/* Name skeleton */}
              <Animated.View
                style={[
                  styles.skeletonBar,
                  { width: 160, height: 18, backgroundColor: theme.colors.border },
                  skeletonStyle,
                ]}
              />
              {/* Description skeleton */}
              <Animated.View
                style={[
                  styles.skeletonBar,
                  { width: 220, height: 12, marginTop: 8, backgroundColor: theme.colors.border },
                  skeletonStyle,
                ]}
              />
              {/* Creator row skeleton */}
              <Animated.View
                style={[
                  styles.skeletonBar,
                  { width: 140, height: 12, marginTop: 8, backgroundColor: theme.colors.border },
                  skeletonStyle,
                ]}
              />
              {/* Meta chips skeleton */}
              <Animated.View
                style={[
                  styles.skeletonBar,
                  { width: 120, height: 10, marginTop: 8, backgroundColor: theme.colors.border },
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

                {description ? (
                  <Text
                    style={[styles.descriptionText, { color: theme.colors.textSecondary }]}
                    numberOfLines={3}
                  >
                    {description}
                  </Text>
                ) : null}

                {creatorName && (
                  <View style={styles.creatorRow}>
                    <View style={[styles.creatorAvatar, { backgroundColor: theme.colors.textPrimary + "15" }]}>
                      <Text style={[styles.creatorInitial, { color: theme.colors.textPrimary }]}>
                        {creatorName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.creatorText, { color: theme.colors.textSecondary }]}>
                      Created by <Text style={{ fontWeight: "700" }}>{creatorName}</Text>
                    </Text>
                  </View>
                )}
                <View style={[styles.metaChips, { marginTop: theme.spacing.xs }]}>
                  <Text style={[styles.metaChipText, { color: theme.colors.textSecondary }]}>{statusLabel}</Text>
                  <Text style={[styles.metaDot, { color: theme.colors.textSecondary }]}>·</Text>
                  {memberCount != null && (
                    <>
                      <Text style={[styles.metaChipText, { color: theme.colors.textSecondary }]}>{memberCount} {t("groups.membersShort")}</Text>
                      <Text style={[styles.metaDot, { color: theme.colors.textSecondary }]}>·</Text>
                    </>
                  )}
                  <Ionicons name={privacy === "private" ? "lock-closed" : "globe"} size={11} color={theme.colors.textSecondary} />
                </View>
              </View>

              {onSharePress && (
                <Pressable
                  onPress={onSharePress}
                  style={({ pressed }) => [
                    styles.shareButton,
                    { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <FontAwesome6 name="share" size={18} color={theme.colors.textInverse} />
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
    <Card style={[styles.card, { marginBottom: theme.spacing.ml }]}>
      <View style={[styles.container, { padding: theme.spacing.ml }]}>
        <GroupAvatar
          avatarType={avatarType}
          avatarValue={avatarValue}
          initials={initials}
          size={80}
          borderRadius={14}
        />
        <View style={[styles.textContainer, { marginStart: theme.spacing.md }]}>
          <AppText variant="title" style={[styles.name, { marginBottom: theme.spacing.xs }]} numberOfLines={2}>
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
    left: 16,
    top: 8,
    zIndex: 10,
  },
  rightIcons: {
    position: "absolute",
    right: 16,
    top: 8,
    flexDirection: "row",
    gap: 10,
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
    paddingHorizontal: 20,
  },
  hudTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hudTitleLeft: {
    flex: 1,
    marginEnd: 20,
  },
  shareButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    marginBottom: 8,
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
    fontSize: 11,
    fontWeight: "500",
  },
  hudNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  officialBadge: {
    width: 24, // lg
    height: 24, // lg
    borderRadius: 12,
    backgroundColor: "#D4A01720",
    alignItems: "center",
    justifyContent: "center",
  },
  hudName: {
    fontSize: 22,
    fontWeight: "700",
  },
  descriptionText: {
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 19,
    marginBottom: 4,
  },
  // Original Styles
  card: {},
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontWeight: "700",
    fontSize: 18,
  },
  metaChips: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  metaDot: {
    fontSize: 11,
  },
  avatarInfoHint: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
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
