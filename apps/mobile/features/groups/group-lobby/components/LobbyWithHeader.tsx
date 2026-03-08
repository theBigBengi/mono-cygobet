// features/groups/group-lobby/components/LobbyWithHeader.tsx
// Wrapper component for group lobby screens with header.

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useTheme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { GroupGamesHeader } from "@/features/groups/predictions/components/GroupGamesHeader";
import { useGoBack } from "@/hooks/useGoBack";

const HEADER_HEIGHT = 64;

interface LobbyWithHeaderProps {
  children: React.ReactNode;
  status: string;
  /** When provided, shows Info icon in header */
  onInfoPress?: () => void;
  /** When true, hides the overlay header (for screens with integrated navigation) */
  hideOverlayHeader?: boolean;
}

export function LobbyWithHeader({
  children,
  status,
  onInfoPress,
  hideOverlayHeader = false,
}: LobbyWithHeaderProps) {
  const goBack = useGoBack("/(tabs)/groups");
  const { theme } = useTheme();

  const rightContent = (
    <View style={styles.headerIcons}>
      {onInfoPress && (
        <Pressable
          onPress={onInfoPress}
          style={({ pressed }) => [pressed && styles.iconPressed]}
        >
          <View style={styles.settingsButton}>
            <Ionicons
              name="information-circle-outline"
              size={22}
              color={theme.colors.textPrimary}
            />
          </View>
        </Pressable>
      )}
    </View>
  );

  return (
    <View
      style={[
        styles.lobbyContainer,
        { backgroundColor: hideOverlayHeader ? "transparent" : theme.colors.background },
      ]}
    >
      <View style={[styles.lobbyContent, !hideOverlayHeader && { paddingTop: HEADER_HEIGHT }]}>
        {children}
      </View>
      {!hideOverlayHeader && (
        <View style={styles.headerOverlay} pointerEvents="box-none">
          <GroupGamesHeader
            backOnly
            onBack={goBack}
            rightContent={rightContent}
          />
        </View>
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
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 99,
    justifyContent: "center",
    alignItems: "center",
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconPressed: {
    opacity: 0.6,
  },
});
