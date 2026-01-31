// features/pools/create/CreatePoolModal.tsx
// Single-step Create Pool modal.
// - Allows creating a pool with name and privacy.
// - Navigates to lobby after successful creation.

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "@/lib/theme";
import { AppText, Button } from "@/components/ui";
import { useCreateGroupMutation } from "@/domains/groups";
import type { ApiGroupPrivacy } from "@repo/types";

interface CreatePoolModalProps {
  visible: boolean;
  onRequestClose: () => void;
}

export function CreatePoolModal({
  visible,
  onRequestClose,
}: CreatePoolModalProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [name, setName] = useState("");
  const [privacy, setPrivacy] = useState<ApiGroupPrivacy>("private");

  const createGroupMutation = useCreateGroupMutation();

  // Reset form when modal closes
  React.useEffect(() => {
    if (!visible) {
      setName("");
      setPrivacy("private");
      createGroupMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleCreate = async () => {
    if (!name.trim()) return;

    try {
      const result = await createGroupMutation.mutateAsync({
        name: name.trim(),
        privacy,
      });

      // Close modal
      onRequestClose();

      // Navigate to lobby - within Pools stack (relative path from pools/)
      router.push(`/(protected)/pools/${result.data.id}` as any);
    } catch (error) {
      // Error is handled by mutation, stay in modal
      // Could show toast here if needed
    }
  };

  const isCreateDisabled = !name.trim() || createGroupMutation.isPending;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onRequestClose}
      presentationStyle="fullScreen"
      statusBarTranslucent={false}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[
          styles.keyboardAvoidingView,
          {
            backgroundColor: theme.colors.background,
          },
        ]}
        keyboardVerticalOffset={0}
      >
        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: theme.colors.background,
              paddingTop: insets.top,
            },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.modalHeader,
              {
                borderBottomColor: theme.colors.border,
              },
            ]}
          >
            <Pressable
              onPress={onRequestClose}
              style={styles.headerButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              disabled={createGroupMutation.isPending}
            >
              <MaterialIcons
                name="close"
                size={32}
                color={theme.colors.textSecondary}
              />
            </Pressable>
            <AppText variant="subtitle" style={styles.modalHeaderTitle}>
              {t("pool.createPool")}
            </AppText>
            <View style={styles.headerButtonPlaceholder} />
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Pool Name Input */}
            <View style={styles.inputContainer}>
              <AppText variant="body" style={styles.label}>
                Pool Name
              </AppText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.textPrimary,
                  },
                ]}
                placeholder={t("pool.poolNamePlaceholder")}
                placeholderTextColor={theme.colors.textSecondary}
                value={name}
                onChangeText={setName}
                editable={!createGroupMutation.isPending}
                autoFocus
              />
            </View>

            {/* Privacy Selector */}
            <View style={styles.inputContainer}>
              <AppText variant="body" style={styles.label}>
                Privacy
              </AppText>
              <View style={styles.privacyContainer}>
                <Pressable
                  style={[
                    styles.privacyOption,
                    {
                      backgroundColor:
                        privacy === "private"
                          ? theme.colors.primary
                          : theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => setPrivacy("private")}
                  disabled={createGroupMutation.isPending}
                >
                  <AppText
                    variant="body"
                    style={[
                      styles.privacyOptionText,
                      {
                        color:
                          privacy === "private"
                            ? theme.colors.primaryText
                            : theme.colors.textPrimary,
                        fontWeight: privacy === "private" ? "600" : "400",
                      },
                    ]}
                  >
                    {t("pool.private")}
                  </AppText>
                </Pressable>
                <Pressable
                  style={[
                    styles.privacyOption,
                    {
                      backgroundColor:
                        privacy === "public"
                          ? theme.colors.primary
                          : theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => setPrivacy("public")}
                  disabled={createGroupMutation.isPending}
                >
                  <AppText
                    variant="body"
                    style={[
                      styles.privacyOptionText,
                      {
                        color:
                          privacy === "public"
                            ? theme.colors.primaryText
                            : theme.colors.textPrimary,
                        fontWeight: privacy === "public" ? "600" : "400",
                      },
                    ]}
                  >
                    {t("pool.public")}
                  </AppText>
                </Pressable>
              </View>
              <AppText
                variant="caption"
                color="secondary"
                style={styles.helperText}
              >
                {privacy === "private"
                  ? "Only invited users can join"
                  : "Anyone can join"}
              </AppText>
            </View>

            {/* Error Message */}
            {createGroupMutation.isError && (
              <View
                style={[
                  styles.errorContainer,
                  {
                    backgroundColor: theme.colors.surface,
                    borderWidth: 1,
                    borderColor: theme.colors.danger,
                  },
                ]}
              >
                <AppText variant="caption" color="danger">
                  {createGroupMutation.error?.message ||
                    t("pool.failedCreate")}
                </AppText>
              </View>
            )}
          </View>

          {/* Floating Button */}
          <View
            style={[
              styles.floatingButtonContainer,
              {
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            <Button
              label={createGroupMutation.isPending ? t("pool.creating") : t("pool.create")}
              onPress={handleCreate}
              disabled={isCreateDisabled}
              style={styles.createButton}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingBottom: 4,
    paddingTop: 8,
    minHeight: 44,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerButtonPlaceholder: {
    width: 40,
    height: 40,
  },
  modalHeaderTitle: {
    flex: 1,
    textAlign: "center",
    fontWeight: "700",
  },
  content: {
    flex: 1,
    padding: 16,
    paddingBottom: 80, // Space for floating button
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    marginBottom: 8,
    fontWeight: "600",
  },
  input: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  privacyContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  privacyOption: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  privacyOptionText: {
    fontSize: 16,
  },
  helperText: {
    marginTop: 4,
  },
  errorContainer: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
  },
  floatingButtonContainer: {
    padding: 16,
    paddingTop: 12,
    backgroundColor: "transparent",
  },
  createButton: {
    width: "100%",
  },
});
