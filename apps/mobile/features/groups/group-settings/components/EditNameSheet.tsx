// features/groups/group-settings/components/EditNameSheet.tsx
// Bottom sheet to edit group name.

import React, { useState, useEffect, useCallback } from "react";
import { View, TextInput, StyleSheet, Alert } from "react-native";
import { BottomSheetModal, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { SettingsRowBottomSheet } from "@/features/settings";
import type { ApiGroupItem, ApiUpdateGroupBody, ApiGroupResponse } from "@repo/types";
import type { UseMutationResult } from "@tanstack/react-query";
import type { ApiError } from "@/lib/http/apiError";

interface EditNameSheetProps {
  sheetRef: React.RefObject<React.ComponentRef<typeof BottomSheetModal> | null>;
  group: ApiGroupItem | null;
  updateGroupMutation: UseMutationResult<
    ApiGroupResponse,
    ApiError,
    ApiUpdateGroupBody
  >;
}

export function EditNameSheet({
  sheetRef,
  group,
  updateGroupMutation,
}: EditNameSheetProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const [name, setName] = useState(group?.name ?? "");

  // Reset when sheet opens
  useEffect(() => {
    if (group) {
      setName(group.name ?? "");
    }
  }, [group?.name]);

  const handleSave = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert(t("errors.error"), t("changePassword.fillAllFields"));
      return;
    }
    if (trimmed === (group?.name ?? "")) {
      sheetRef.current?.dismiss();
      return;
    }

    updateGroupMutation.mutate(
      { name: trimmed },
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
  }, [name, group?.name, updateGroupMutation, sheetRef, t]);

  if (!group) return null;

  return (
    <SettingsRowBottomSheet.Sheet
      sheetRef={sheetRef}
      title={t("groupSettings.editName")}
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
          value={name}
          onChangeText={setName}
          placeholder={t("lobby.groupNamePlaceholder")}
          placeholderTextColor={theme.colors.textSecondary}
          autoFocus
        />
        <Button
          label={
            updateGroupMutation.isPending
              ? t("common.loading")
              : t("editProfile.save")
          }
          onPress={handleSave}
          disabled={updateGroupMutation.isPending}
          style={{ marginTop: theme.spacing.md }}
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
  },
});
