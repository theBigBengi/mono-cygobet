// features/profile/stats/components/HeroHeader.tsx
// Compact hero section with avatar and username (lobby-style, no stats).

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";

interface HeroHeaderProps {
  username: string | null;
  image: string | null;
  showEditButton?: boolean;
  onEditPress?: () => void;
}

function getInitials(username: string | null): string {
  if (!username || !username.trim()) return "?";
  const parts = username.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return username.slice(0, 2).toUpperCase();
}

export function HeroHeader({
  username,
  image,
  showEditButton,
  onEditPress,
}: HeroHeaderProps) {
  const { theme } = useTheme();
  const initials = getInitials(username);
  void image;

  return (
    <View style={styles.container}>
      {showEditButton && (
        <Pressable style={styles.editButton} onPress={onEditPress} hitSlop={10}>
          <MaterialIcons
            name="edit"
            size={18}
            color={theme.colors.textSecondary}
          />
        </Pressable>
      )}

      <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
        <AppText style={[styles.initials, { color: theme.colors.primaryText }]}>
          {initials}
        </AppText>
      </View>

      <AppText
        variant="title"
        style={[styles.username, { color: theme.colors.textPrimary }]}
      >
        {username || "unknown"}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    overflow: "visible",
  },
  editButton: {
    position: "absolute",
    top: 16,
    right: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    overflow: "visible",
  },
  initials: {
    fontSize: 22,
    fontWeight: "600",
    lineHeight: 26,
  },
  username: {
    fontWeight: "700",
    textAlign: "center",
  },
});
