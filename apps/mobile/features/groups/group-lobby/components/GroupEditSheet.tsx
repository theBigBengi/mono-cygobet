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
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}
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
              size={96}
              borderRadius={26}
              flat
            />
            <View style={[styles.avatarEditBadge, { backgroundColor: theme.colors.background }]}>
              <Ionicons name="color-palette-outline" size={14} color={theme.colors.textSecondary} />
            </View>
          </Pressable>

          {/* Name */}
          <BottomSheetTextInput
            style={[
              styles.nameInput,
              {
                color: theme.colors.textPrimary,
                backgroundColor: theme.colors.textPrimary + "08",
              },
            ]}
            placeholder={t("groupCreation.groupNamePlaceholder")}
            placeholderTextColor={theme.colors.textSecondary + "60"}
            value={name}
            onChangeText={setName}
            maxLength={40}
            selectTextOnFocus
          />

          {/* Description */}
          <BottomSheetTextInput
            style={[
              styles.descInput,
              {
                color: theme.colors.textPrimary,
                backgroundColor: theme.colors.textPrimary + "08",
              },
            ]}
            placeholder={t("lobby.descriptionPlaceholder")}
            placeholderTextColor={theme.colors.textSecondary + "50"}
            value={description}
            onChangeText={setDescription}
            maxLength={200}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* Save Button */}
          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            style={({ pressed }) => [
              styles.saveBtn,
              {
                backgroundColor: theme.colors.primary,
                opacity: !canSave ? 0.4 : pressed ? 0.8 : 1,
              },
            ]}
          >
            {updateGroupMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>{t("editProfile.save")}</Text>
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    alignItems: "center",
  },
  avatarPicker: {
    alignSelf: "center",
    marginBottom: 20,
    position: "relative",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  nameInput: {
    fontSize: 18,
    fontWeight: "500",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    textAlign: "left",
    width: "100%",
  },
  descInput: {
    fontSize: 14,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    minHeight: 80,
    textAlign: "left",
    width: "100%",
  },
  saveBtn: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    width: "100%",
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
