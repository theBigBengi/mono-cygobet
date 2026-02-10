// features/groups/group-settings/components/EditDescriptionSheet.tsx
// Bottom sheet to edit group description.

import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { BottomSheetModal, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";
import { AppText, Button } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { SettingsRowBottomSheet } from "@/features/settings";
import type { ApiGroupItem, ApiUpdateGroupBody, ApiGroupResponse } from "@repo/types";
import type { UseMutationResult } from "@tanstack/react-query";
import type { ApiError } from "@/lib/http/apiError";

const MAX_LENGTH = 500;

interface EditDescriptionSheetProps {
  sheetRef: React.RefObject<React.ComponentRef<typeof BottomSheetModal> | null>;
  group: ApiGroupItem | null;
  updateGroupMutation: UseMutationResult<
    ApiGroupResponse,
    ApiError,
    ApiUpdateGroupBody
  >;
}

export function EditDescriptionSheet({
  sheetRef,
  group,
  updateGroupMutation,
}: EditDescriptionSheetProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const [description, setDescription] = useState(group?.description ?? "");

  // Reset when sheet opens
  useEffect(() => {
    if (group) {
      setDescription(group.description ?? "");
    }
  }, [group?.description]);

  const handleSave = useCallback(() => {
    const trimmed = description.trim();
    if (trimmed.length > MAX_LENGTH) {
      Alert.alert(t("errors.error"), t("groupSettings.maxDescriptionError"));
      return;
    }

    const currentDesc = group?.description ?? "";
    if (trimmed === currentDesc) {
      sheetRef.current?.dismiss();
      return;
    }

    updateGroupMutation.mutate(
      { description: trimmed || undefined },
      {
        onSuccess: () => sheetRef.current?.dismiss(),
        onError: (error) => {
          Alert.alert(
            t("errors.error"),
            error?.message || t("editProfile.updateFailed")
          );
        },
      }
    );
  }, [description, group?.description, updateGroupMutation, sheetRef, t]);

  if (!group) return null;

  return (
    <SettingsRowBottomSheet.Sheet
      sheetRef={sheetRef}
      title={t("groupSettings.editDescription")}
    >
      <View style={styles.content}>
        <BottomSheetTextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.textPrimary,
            },
          ]}
          value={description}
          onChangeText={setDescription}
          placeholder={t("lobby.descriptionPlaceholder")}
          placeholderTextColor={theme.colors.textSecondary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={MAX_LENGTH}
        />
        <AppText
          variant="caption"
          color="secondary"
          style={styles.counter}
        >
          {description.length}/{MAX_LENGTH}
        </AppText>
        <Button
          label={
            updateGroupMutation.isPending
              ? t("common.loading")
              : t("editProfile.save")
          }
          onPress={handleSave}
          disabled={updateGroupMutation.isPending}
        />
      </View>
    </SettingsRowBottomSheet.Sheet>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
  },
  counter: {
    textAlign: "right",
  },
});
