// app/change-password.tsx
// Change password screen (email/password users only).

import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { AppText, Button, PasswordInput } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useChangePasswordMutation } from "@/lib/auth/auth.mutations";

export default function ChangePasswordScreen() {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const router = useRouter();
  const mutation = useChangePasswordMutation();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(t("errors.error"), t("changePassword.fillAllFields"));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t("errors.error"), t("changePassword.passwordsDontMatch"));
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert(t("errors.error"), t("changePassword.passwordTooShort"));
      return;
    }

    mutation.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          Alert.alert(
            t("changePassword.success"),
            t("changePassword.successMessage"),
            [{ text: "OK", onPress: () => router.back() }]
          );
        },
        onError: (error) => {
          Alert.alert(
            t("errors.error"),
            error.message || t("changePassword.failed")
          );
        },
      }
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.colors.textPrimary}
          />
        </Pressable>
        <AppText variant="subtitle" style={styles.headerTitle}>
          {t("changePassword.title")}
        </AppText>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inputContainer}>
            <AppText
              variant="caption"
              color="secondary"
              style={styles.inputLabel}
            >
              {t("changePassword.currentPassword")}
            </AppText>
            <PasswordInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.textPrimary,
                },
              ]}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder={t("changePassword.currentPasswordPlaceholder")}
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <View style={styles.inputContainer}>
            <AppText
              variant="caption"
              color="secondary"
              style={styles.inputLabel}
            >
              {t("changePassword.newPassword")}
            </AppText>
            <PasswordInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.textPrimary,
                },
              ]}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={t("changePassword.newPasswordPlaceholder")}
              placeholderTextColor={theme.colors.textSecondary}
            />
            <AppText
              variant="caption"
              color="secondary"
              style={styles.inputHint}
            >
              {t("changePassword.passwordHint")}
            </AppText>
          </View>

          <View style={styles.inputContainer}>
            <AppText
              variant="caption"
              color="secondary"
              style={styles.inputLabel}
            >
              {t("changePassword.confirmPassword")}
            </AppText>
            <PasswordInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.textPrimary,
                },
              ]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t("changePassword.confirmPasswordPlaceholder")}
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <Button
            label={
              mutation.isPending
                ? t("common.loading")
                : t("changePassword.submit")
            }
            onPress={handleSubmit}
            disabled={mutation.isPending}
            style={styles.submitButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
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
  backButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontWeight: "600",
  },
  headerSpacer: {
    width: 32,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    marginBottom: 6,
    marginStart: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
  },
  inputHint: {
    marginTop: 6,
    marginStart: 4,
  },
  submitButton: {
    marginTop: 8,
  },
});
