import React from "react";
import { View, StyleSheet } from "react-native";
import { Button } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface PublishGroupButtonProps {
  /**
   * Callback when publish button is pressed
   */
  onPress: () => void;
  /**
   * Whether the publish action is pending
   */
  isPending: boolean;
  /**
   * Whether the button should be disabled
   */
  disabled: boolean;
}

/**
 * Floating button component for publishing a group.
 * Positioned at the bottom of the screen with proper safe area insets.
 * Only renders when should be visible (handled by parent).
 */
export function PublishGroupButton({
  onPress,
  isPending,
  disabled,
}: PublishGroupButtonProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.floatingButtonContainer,
        {
          paddingBottom: Math.max(insets.bottom, theme.spacing.md),
          paddingHorizontal: theme.spacing.md,
          paddingTop: theme.spacing.md,
        },
      ]}
      pointerEvents="box-none"
    >
      <Button
        label={isPending ? "Publishing..." : "Publish Group"}
        onPress={onPress}
        disabled={disabled}
        style={styles.floatingButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  floatingButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "stretch",
    justifyContent: "center",
    pointerEvents: "box-none",
    zIndex: 1000,
  },
  floatingButton: {
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
