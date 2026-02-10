// features/groups/group-settings/components/EditNameModal.tsx
// Modal to edit group name.

import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { AppText, Button } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { ApiGroupItem } from "@repo/types";
import type { UseMutationResult } from "@tanstack/react-query";
import type { ApiGroupResponse } from "@repo/types";
import type { ApiError } from "@/lib/http/apiError";
import type { ApiUpdateGroupBody } from "@repo/types";

interface EditNameModalProps {
  visible: boolean;
  onClose: () => void;
  group: ApiGroupItem | null;
  updateGroupMutation: UseMutationResult<
    ApiGroupResponse,
    ApiError,
    ApiUpdateGroupBody
  >;
}

export function EditNameModal({
  visible,
  onClose,
  group,
  updateGroupMutation,
}: EditNameModalProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const [name, setName] = useState(group?.name ?? "");

  useEffect(() => {
    if (visible && group) {
      setName(group.name ?? "");
    }
  }, [visible, group?.name]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert(t("errors.error"), t("changePassword.fillAllFields"));
      return;
    }
    if (trimmed === (group?.name ?? "")) {
      onClose();
      return;
    }

    updateGroupMutation.mutate(
      { name: trimmed },
      {
        onSuccess: () => onClose(),
        onError: (error) => {
          Alert.alert(
            t("errors.error"),
            error?.message || t("editProfile.updateFailed")
          );
        },
      }
    );
  };

  if (!group) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View
          style={[styles.header, { borderBottomColor: theme.colors.border }]}
        >
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons
              name="close"
              size={28}
              color={theme.colors.textSecondary}
            />
          </Pressable>
          <AppText variant="subtitle" style={styles.headerTitle}>
            {t("groupSettings.editName")}
          </AppText>
          <View style={{ width: 28 }} />
        </View>

        <View style={[styles.content, { padding: theme.spacing.md }]}>
          <TextInput
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
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
});
