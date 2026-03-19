// features/groups/group-lobby/components/LobbyActionCard.tsx
// Shared card for lobby actions (Ranking, Chat, Invite, Predictions Overview).

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Card, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { getShadowStyle } from "@/lib/theme/shadows";
import { LobbyCardSkeleton } from "./LobbyCardSkeleton";

export interface LobbyActionCardLastMessage {
  text: string;
  senderName: string;
  senderAvatar: string | null;
  timestamp: string;
  isRead: boolean;
}

export interface LobbyActionCardProps {
  icon?: keyof typeof Ionicons.glyphMap;
  /** Custom icon element to render instead of Ionicons */
  customIcon?: React.ReactNode;
  iconColor?: string;
  title: string;
  subtitle?: string;
  badge?: number;
  onPress: () => void;
  /** When provided, shows a preview row (avatar, sender + text, timestamp) instead of subtitle */
  lastMessage?: LobbyActionCardLastMessage;
  /** True while data is loading. Shows skeleton instead of content. */
  isLoading?: boolean;
}

export function LobbyActionCard({
  icon,
  customIcon,
  iconColor,
  title,
  subtitle,
  badge = 0,
  onPress,
  lastMessage,
  isLoading = false,
}: LobbyActionCardProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const color = iconColor ?? theme.colors.primary;

  if (isLoading) {
    return <LobbyCardSkeleton height={80} />;
  }

  const renderIcon = () => {
    if (customIcon) {
      return customIcon;
    }
    if (icon) {
      return <Ionicons name={icon} size={24} color={color} style={styles.icon} />;
    }
    return null;
  };

  return (
    <Card style={styles.card}>
      <Pressable
        onPress={onPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={({ pressed }) => [styles.row, { opacity: pressed ? 0.8 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        {renderIcon()}
        <View style={styles.textBlock}>
          <View style={styles.titleRow}>
            <AppText variant="body" style={[styles.title, { flex: 1 }]}>
              {title}
            </AppText>
            {badge > 0 && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                <AppText
                  variant="caption"
                  style={[
                    styles.badgeText,
                    { color: theme.colors.primaryText },
                  ]}
                >
                  {badge > 99 ? "99+" : String(badge)}
                </AppText>
              </View>
            )}
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.colors.textSecondary}
              style={styles.chevron}
            />
          </View>
          {lastMessage ? (
            <View style={styles.messagePreview}>
              {lastMessage.senderAvatar ? (
                <Image
                  source={lastMessage.senderAvatar}
                  style={styles.avatar}
                  cachePolicy="disk"
                />
              ) : (
                <View
                  style={[
                    styles.avatar,
                    styles.avatarPlaceholder,
                    { backgroundColor: theme.colors.border },
                  ]}
                >
                  <AppText
                    variant="caption"
                    style={[
                      styles.avatarInitial,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {lastMessage.senderName.charAt(0).toUpperCase()}
                  </AppText>
                </View>
              )}
              <AppText
                variant="caption"
                color="secondary"
                numberOfLines={1}
                style={[
                  styles.messageText,
                  !lastMessage.isRead && styles.unreadText,
                  !lastMessage.isRead && { color: theme.colors.textPrimary },
                ]}
              >
                {lastMessage.senderName}: {lastMessage.text}
              </AppText>
              <AppText
                variant="caption"
                color="secondary"
                style={styles.timestamp}
              >
                {lastMessage.timestamp}
              </AppText>
            </View>
          ) : subtitle != null && subtitle !== "" ? (
            <AppText
              variant="caption"
              color="secondary"
              style={styles.subtitle}
            >
              {subtitle}
            </AppText>
          ) : null}
        </View>
      </Pressable>
    </Card>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    card: {
      marginBottom: theme.spacing.md,
      borderRadius: theme.radius.lg,
      ...getShadowStyle("sm"),
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.ms,
    },
    icon: {
      marginEnd: 0,
    },
    textBlock: {
      flex: 1,
      minWidth: 0,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    title: {
      fontWeight: "600",
    },
    subtitle: {
      marginTop: theme.spacing.xxs,
    },
    messagePreview: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      marginTop: 6,
    },
    avatar: {
      width: 20,
      height: 20,
      borderRadius: theme.radius.full,
    },
    avatarPlaceholder: {
      justifyContent: "center",
      alignItems: "center",
    },
    avatarInitial: {
      fontSize: 10,
      fontWeight: "600",
    },
    messageText: {
      flex: 1,
      minWidth: 0,
    },
    unreadText: {
      fontWeight: "600",
    },
    timestamp: {
      marginStart: theme.spacing.xs,
    },
    badge: {
      minWidth: 20,
      height: 20,
      borderRadius: theme.radius.full,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.xs,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: "700",
    },
    chevron: {
      marginStart: 0,
    },
  });
