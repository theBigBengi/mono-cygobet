// features/groups/group-lobby/components/LobbyActionCard.tsx
// Shared card for lobby actions (Ranking, Chat, Invite, Predictions Overview).

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";

export interface LobbyActionCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  title: string;
  subtitle?: string;
  badge?: number;
  onPress: () => void;
}

export function LobbyActionCard({
  icon,
  iconColor,
  title,
  subtitle,
  badge = 0,
  onPress,
}: LobbyActionCardProps) {
  const { theme } = useTheme();
  const color = iconColor ?? theme.colors.primary;

  return (
    <Card style={styles.card}>
      <Pressable
        onPress={onPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={({ pressed }) => [styles.row, { opacity: pressed ? 0.8 : 1 }]}
      >
        <Ionicons name={icon} size={24} color={color} style={styles.icon} />
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
          {subtitle != null && subtitle !== "" && (
            <AppText
              variant="caption"
              color="secondary"
              style={styles.subtitle}
            >
              {subtitle}
            </AppText>
          )}
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
