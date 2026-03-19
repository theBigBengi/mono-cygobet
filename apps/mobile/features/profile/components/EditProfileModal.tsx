// features/profile/components/EditProfileModal.tsx
// Modal to edit username and display name.

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
import { useUpdateProfileMutation } from "@/domains/profile";

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  currentUsername: string | null;
  currentName: string | null;
  currentImage: string | null;
}

const USERNAME_REGEX = /^[\u0590-\u05FFa-zA-Z0-9_-]+$/;

export function EditProfileModal({
  visible,
  onClose,
  currentUsername,
  currentName,
  currentImage,
}: EditProfileModalProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const mutation = useUpdateProfileMutation();

  const [username, setUsername] = useState(currentUsername ?? "");
  const [name, setName] = useState(currentName ?? "");

  useEffect(() => {
    if (visible) {
      setUsername(currentUsername ?? "");
      setName(currentName ?? "");
    }
  }, [visible, currentUsername, currentName]);

  const handleSave = () => {
    if (username.length < 3) {
      Alert.alert(t("errors.error"), t("auth.errorUsernameMin"));
      return;
    }
    if (username.length > 50) {
      Alert.alert(t("errors.error"), t("auth.errorUsernameMax"));
      return;
    }
    if (!USERNAME_REGEX.test(username)) {
      Alert.alert(t("errors.error"), t("auth.errorUsernameFormat"));
      return;
    }

    const updates: { username?: string; name?: string } = {};
    if (username !== (currentUsername ?? "")) updates.username = username;
    if (name !== (currentName ?? "")) updates.name = name || undefined;

    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }

    mutation.mutate(updates, {
      onSuccess: () => {
        onClose();
      },
      onError: (error) => {
        Alert.alert(
          t("errors.error"),
          error.message || t("editProfile.updateFailed")
        );
      },
    });
  };

  const initials = (username || "U").slice(0, 1).toUpperCase();

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
          style={[styles.header, { borderBottomColor: theme.colors.border, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.ms }]}
        >
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons
              name="close"
              size={28}
              color={theme.colors.textSecondary}
            />
          </Pressable>
          <AppText variant="subtitle" style={styles.headerTitle}>
            {t("editProfile.title")}
          </AppText>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[styles.contentContainer, { padding: theme.spacing.md }]}
        >
          <View style={[styles.avatarSection, { marginBottom: theme.spacing.lg }]}>
            <View
              style={[styles.avatar, { backgroundColor: theme.colors.primary, borderRadius: theme.radius.full }]}
            >
              <AppText
                variant="title"
                style={{ color: theme.colors.primaryText }}
              >
                {initials}
              </AppText>
            </View>
          </View>

          <View style={[styles.inputContainer, { marginBottom: theme.spacing.md }]}>
            <AppText
              variant="caption"
              color="secondary"
              style={[styles.inputLabel, { marginBottom: theme.spacing.xs, marginStart: theme.spacing.xs }]}
            >
              {t("editProfile.username")}
            </AppText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.textPrimary,
                  borderRadius: theme.radius.md,
                  padding: theme.spacing.ms,
                  fontSize: 16,
                },
              ]}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={t("editProfile.usernamePlaceholder")}
              placeholderTextColor={theme.colors.textSecondary}
            />
            <AppText
              variant="caption"
              color="secondary"
              style={[styles.inputHint, { marginTop: theme.spacing.xs, marginStart: theme.spacing.xs }]}
            >
              {t("auth.usernameHint")}
            </AppText>
          </View>

          <View style={[styles.inputContainer, { marginBottom: theme.spacing.md }]}>
            <AppText
              variant="caption"
              color="secondary"
              style={[styles.inputLabel, { marginBottom: theme.spacing.xs, marginStart: theme.spacing.xs }]}
            >
              {t("editProfile.displayName")}
            </AppText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.textPrimary,
                  borderRadius: theme.radius.md,
                  padding: theme.spacing.ms,
                  fontSize: 16,
                },
              ]}
              value={name}
              onChangeText={setName}
              placeholder={t("editProfile.displayNamePlaceholder")}
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <Button
            label={
              mutation.isPending ? t("common.loading") : t("editProfile.save")
            }
            onPress={handleSave}
            disabled={mutation.isPending}
            style={{ marginTop: theme.spacing.lg }}
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  contentContainer: {},
  avatarSection: {
    alignItems: "center",
  },
  avatar: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  inputContainer: {},
  inputLabel: {},
  input: {
    borderWidth: 1,
  },
  inputHint: {},
});
