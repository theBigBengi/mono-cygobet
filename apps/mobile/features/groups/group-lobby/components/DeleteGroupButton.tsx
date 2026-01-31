import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet } from "react-native";
import { Button } from "@/components/ui";
 
interface DeleteGroupButtonProps {
  /**
   * Callback when delete button is pressed
   */
  onPress: () => void;
  /**
   * Whether the delete action is pending
   */
  isPending: boolean;
  /**
   * Whether the button should be disabled
   */
  disabled: boolean;
  /**
   * Optional bottom offset to position button above other elements
   */
  bottomOffset?: number;
}

/**
 * Floating button component for deleting a group.
 * Positioned at the bottom of the screen with proper safe area insets.
 * Uses danger variant for destructive action styling.
 * Only renders when should be visible (handled by parent).
 */
export function DeleteGroupButton({
  onPress,
  isPending,
  disabled,
}: DeleteGroupButtonProps) {
  const { t } = useTranslation("common");
  return (
    <View
      style={[
        styles.floatingButtonContainer,
        
      ]}
      pointerEvents="box-none"
    >
      <Button
        label={isPending ? t("groups.deleting") : t("groups.deleteGroupDraft")}
        onPress={onPress}
        disabled={disabled}
        variant="danger"
        style={styles.floatingButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  floatingButtonContainer: {
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "box-none",
    zIndex: 999,
  },
  floatingButton: {
    minWidth: 200,
    width: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
