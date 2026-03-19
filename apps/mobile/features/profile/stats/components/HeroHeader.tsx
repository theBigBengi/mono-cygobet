// features/profile/stats/components/HeroHeader.tsx
// Compact hero section with avatar and username (lobby-style, no stats).

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { getInitials } from "@/utils/string";

interface HeroHeaderProps {
  username: string | null;
  image: string | null;
  showEditButton?: boolean;
  onEditPress?: () => void;
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
    <View style={[styles.container, { paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.md, paddingHorizontal: theme.spacing.ml }]}>
      {showEditButton && (
        <Pressable style={[styles.editButton, { top: theme.spacing.md, right: theme.spacing.md }]} onPress={onEditPress} hitSlop={10}>
          <MaterialIcons
            name="edit"
            size={18}
            color={theme.colors.textSecondary}
          />
        </Pressable>
      )}

      <View style={[styles.avatar, { backgroundColor: theme.colors.primary, borderRadius: theme.radius.full, marginBottom: theme.spacing.ms }]}>
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
    alignItems: "center",
    overflow: "visible",
  },
  editButton: {
    position: "absolute",
  },
  avatar: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
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
