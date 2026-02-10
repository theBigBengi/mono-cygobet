// features/groups/group-settings/components/EditDescriptionModal.tsx
// Modal to edit group description.

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
  ScrollView,
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

const MAX_DESCRIPTION_LENGTH = 500;

interface EditDescriptionModalProps {
  visible: boolean;
  onClose: () => void;
  group: ApiGroupItem | null;
  updateGroupMutation: UseMutationResult<
    ApiGroupResponse,
    ApiError,
    ApiUpdateGroupBody
  >;
}

export function EditDescriptionModal({
  visible,
  onClose,
  group,
  updateGroupMutation,
}: EditDescriptionModalProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const [description, setDescription] = useState(group?.description ?? "");

  useEffect(() => {
    if (visible && group) {
      setDescription(group.description ?? "");
    }
  }, [visible, group?.description]);

  const handleSave = () => {
    const value = description.trim();
    const current = (group?.description ?? "").trim();
    if (value === current) {
      onClose();
      return;
    }

    if (value.length > MAX_DESCRIPTION_LENGTH) {
      Alert.alert(t("errors.error"), t("groupSettings.maxDescriptionError"));
      return;
    }

    updateGroupMutation.mutate(
      { description: value || null },
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
            {t("groupSettings.editDescription")}
          </AppText>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.contentContainer,
            { padding: theme.spacing.md },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
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
            maxLength={MAX_DESCRIPTION_LENGTH}
            textAlignVertical="top"
          />
          <AppText variant="caption" color="secondary" style={styles.charCount}>
            {description.length}/{MAX_DESCRIPTION_LENGTH}
          </AppText>
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
        </ScrollView>
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
  contentContainer: {},
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
  },
  charCount: {
    marginTop: 4,
    alignSelf: "flex-end",
  },
});
