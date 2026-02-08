// features/profile/components/EditProfileModal.tsx
// Modal to edit username and display name.

import React from "react";
import {
  Modal,
  View,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { AppText, Button } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useEditProfile } from "../hooks/useEditProfile";

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  currentUsername: string | null;
  currentName: string | null;
  currentImage: string | null;
}

export function EditProfileModal({
  visible,
  onClose,
  currentUsername,
  currentName,
  currentImage,
}: EditProfileModalProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  const {
    username,
    name,
    initials,
    setUsername,
    setName,
    handleSave,
    isSaving,
  } = useEditProfile({ visible, currentUsername, currentName, onClose });

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
            {t("editProfile.title")}
          </AppText>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
        >
          <View style={styles.avatarSection}>
            <View
              style={[styles.avatar, { backgroundColor: theme.colors.primary }]}
            >
              <AppText
                variant="title"
                style={[styles.avatarText, { color: theme.colors.primaryText }]}
              >
                {initials}
              </AppText>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <AppText
              variant="caption"
              color="secondary"
              style={styles.inputLabel}
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
              style={styles.inputHint}
            >
              {t("auth.usernameHint")}
            </AppText>
          </View>

          <View style={styles.inputContainer}>
            <AppText
              variant="caption"
              color="secondary"
              style={styles.inputLabel}
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
                },
              ]}
              value={name}
              onChangeText={setName}
              placeholder={t("editProfile.displayNamePlaceholder")}
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <Button
            label={isSaving ? t("common.loading") : t("editProfile.save")}
            onPress={handleSave}
            disabled={isSaving}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontWeight: "600",
  },
  headerSpacer: {
    width: 28,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {},
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    marginBottom: 4,
    marginStart: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputHint: {
    marginTop: 4,
    marginStart: 4,
  },
});
