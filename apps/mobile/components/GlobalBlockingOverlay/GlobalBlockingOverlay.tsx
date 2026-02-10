// components/GlobalBlockingOverlay/GlobalBlockingOverlay.tsx
// Global blocking overlay component that covers the entire screen.
// Used during group creation to block interaction until the group screen is ready.

import React from "react";
import { View, StyleSheet, ActivityIndicator, Modal, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { useAtomValue } from "jotai";
import { globalBlockingOverlayAtom } from "@/lib/state/globalOverlay.atom";
import { useTheme } from "@/lib/theme";
import { AppText } from "@/components/ui";

/**
 * GlobalBlockingOverlay
 *
 * Full-screen overlay that blocks all interaction.
 * Uses its own Modal with presentationStyle="overFullScreen" to appear above
 * pageSheet modals. Mounted at root level so it stays visible during navigation.
 * Only visible when globalBlockingOverlayAtom holds a message string.
 */
export function GlobalBlockingOverlay() {
  const overlayMessage = useAtomValue(globalBlockingOverlayAtom);
  const { theme, colorScheme } = useTheme();
  const isDark = colorScheme === "dark";

  if (!overlayMessage) return null;

  return (
    <Modal
      visible={!!overlayMessage}
      transparent
      animationType="none"
      statusBarTranslucent
      hardwareAccelerated
      presentationStyle="overFullScreen"
    >
      <View style={styles.overlay} pointerEvents="box-none">
        <BlurView
          intensity={80}
          tint={isDark ? "dark" : "light"}
          style={[
            StyleSheet.absoluteFill,
            Platform.OS === "android" && {
              backgroundColor: isDark ? "rgba(0, 0, 0, 0.85)" : "rgba(255, 255, 255, 0.85)",
            },
          ]}
        />
        <View style={styles.content}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <AppText variant="body" color="secondary" style={styles.text}>
            {overlayMessage}
          </AppText>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    gap: 16,
  },
  text: {
    marginTop: 12,
  },
});
