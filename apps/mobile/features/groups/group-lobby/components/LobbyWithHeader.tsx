// features/groups/group-lobby/components/LobbyWithHeader.tsx
// Wrapper component for group lobby screens with header.

import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/lib/theme";
import { GroupGamesHeader } from "@/features/groups/predictions/components/GroupGamesHeader";
import { useGoBack } from "@/hooks/useGoBack";

const HEADER_HEIGHT = 64;

interface LobbyWithHeaderProps {
  children: React.ReactNode;
  status: string;
  /** When true, hides the overlay header (for screens with integrated navigation) */
  hideOverlayHeader?: boolean;
}

export function LobbyWithHeader({
  children,
  status,
  hideOverlayHeader = false,
}: LobbyWithHeaderProps) {
  const goBack = useGoBack("/(tabs)/groups");
  const { theme } = useTheme();

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
});
