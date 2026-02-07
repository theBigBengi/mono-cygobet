// features/groups/group-lobby/components/LobbyActionCard.tsx
// Shared card for lobby actions (Ranking, Chat, Invite, Predictions Overview).

import React from "react";
import { View, StyleSheet, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
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
                  source={{ uri: lastMessage.senderAvatar }}
                  style={styles.avatar}
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

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  icon: {
    marginRight: 0,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontWeight: "600",
  },
  subtitle: {
    marginTop: 2,
  },
  messagePreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
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
    marginLeft: 4,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  chevron: {
    marginLeft: 0,
  },
});
