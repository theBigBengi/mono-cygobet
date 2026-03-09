// features/groups/group-lobby/components/GroupEditSheet.tsx
// Bottom sheet for editing group avatar, name, and description — wizard step 1 style.

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/lib/theme";
import { GroupAvatar } from "@/components/ui";
import { AvatarPickerSheet } from "./AvatarPickerSheet";
import type { ApiGroupItem, ApiUpdateGroupBody, ApiGroupResponse } from "@repo/types";
import type { UseMutationResult } from "@tanstack/react-query";
import type { ApiError } from "@/lib/http/apiError";
import { getInitials } from "@/utils/string";

interface GroupEditSheetProps {
  sheetRef: React.RefObject<React.ComponentRef<typeof BottomSheetModal> | null>;
  group: ApiGroupItem | null;
  updateGroupMutation: UseMutationResult<
    ApiGroupResponse,
    ApiError,
    ApiUpdateGroupBody
  >;
  onAvatarChange?: (value: string) => void;
}

export function GroupEditSheet({
  sheetRef,
  group,
  updateGroupMutation,
  onAvatarChange,
}: GroupEditSheetProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const avatarPickerRef = useRef<React.ComponentRef<typeof BottomSheetModal>>(null);

  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [avatarValue, setAvatarValue] = useState(group?.avatarValue ?? "0");

  // Sync state when group data changes
  useEffect(() => {
    if (group) {
      setName(group.name ?? "");
      setDescription(group.description ?? "");
      setAvatarValue(group.avatarValue ?? "0");
    }
  }, [group?.name, group?.description, group?.avatarValue]);

  const hasChanges =
    name.trim() !== (group?.name ?? "") ||
    description.trim() !== (group?.description ?? "") ||
    avatarValue !== (group?.avatarValue ?? "0");

  const canSave = name.trim().length > 0 && hasChanges && !updateGroupMutation.isPending;

  const handleSave = useCallback(() => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert(t("errors.error"), t("changePassword.fillAllFields"));
      return;
    }

    const body: ApiUpdateGroupBody = {};
    if (trimmedName !== (group?.name ?? "")) body.name = trimmedName;
    if (description.trim() !== (group?.description ?? ""))
      body.description = description.trim() || undefined;
    if (avatarValue !== (group?.avatarValue ?? "0")) {
      body.avatarType = "gradient";
      body.avatarValue = avatarValue;
    }

    updateGroupMutation.mutate(body, {
      onSuccess: () => {
        if (body.avatarValue) onAvatarChange?.(body.avatarValue);
        sheetRef.current?.dismiss();
      },
      onError: (error) => {
        Alert.alert(t("errors.error"), error?.message || t("editProfile.updateFailed"));
      },
    });
  }, [name, description, avatarValue, group, updateGroupMutation, sheetRef, onAvatarChange, t]);

  const handleAvatarSelect = useCallback((value: string) => {
    setAvatarValue(value);
  }, []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    []
  );

  if (!group) return null;

  const initials = getInitials(name || group.name);

  return (
    <>
      <BottomSheetModal
        ref={sheetRef}
        enableDynamicSizing
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: theme.colors.background,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
        }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.border, width: 36 }}
      >
        <BottomSheetView style={styles.content}>
          {/* Avatar */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              avatarPickerRef.current?.present();
            }}
            style={styles.avatarPicker}
          >
            <GroupAvatar
              avatarType="gradient"
              avatarValue={avatarValue}
              initials={initials}
              size={80}
              borderRadius={20}
              flat
            />
            <View style={[styles.avatarEditBadge, { backgroundColor: theme.colors.surface, borderColor: theme.colors.background }]}>
              <Ionicons name="color-palette-outline" size={12} color={theme.colors.textSecondary} />
            </View>
          </Pressable>

          {/* Name */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
              {t("groupCreation.groupNamePlaceholder")}
            </Text>
            <BottomSheetTextInput
              style={[
                styles.nameInput,
                {
                  color: theme.colors.textPrimary,
                  borderBottomColor: theme.colors.border,
                },
              ]}
              placeholder={t("groupCreation.groupNamePlaceholder")}
              placeholderTextColor={theme.colors.textSecondary + "40"}
              value={name}
              onChangeText={setName}
              maxLength={40}
              selectTextOnFocus
            />
          </View>

          {/* Description */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
              {t("lobby.descriptionPlaceholder")}
            </Text>
            <BottomSheetTextInput
              style={[
                styles.descInput,
                {
                  color: theme.colors.textPrimary,
                  borderBottomColor: theme.colors.border,
                },
              ]}
              placeholder={t("lobby.descriptionPlaceholder")}
              placeholderTextColor={theme.colors.textSecondary + "40"}
              value={description}
              onChangeText={setDescription}
              maxLength={200}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Save Button */}
          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            style={({ pressed }) => [
              styles.saveBtn,
              {
                backgroundColor: theme.colors.primary,
                opacity: !canSave ? 0.4 : pressed ? 0.85 : 1,
              },
            ]}
          >
            {updateGroupMutation.isPending ? (
              <ActivityIndicator size="small" color={theme.colors.textInverse} />
            ) : (
              <Text style={[styles.saveBtnText, { color: theme.colors.textInverse }]}>{t("editProfile.save")}</Text>
            )}
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>

      <AvatarPickerSheet
        sheetRef={avatarPickerRef}
        selectedValue={avatarValue}
        onSelect={handleAvatarSelect}
        initials={initials}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 36,
  },
  avatarPicker: {
    alignSelf: "center",
    marginBottom: 28,
    position: "relative",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 6,
  },
  nameInput: {
    fontSize: 16,
    fontWeight: "500",
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  descInput: {
    fontSize: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    minHeight: 60,
  },
  saveBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
