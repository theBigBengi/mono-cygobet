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
  Text,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PasswordInput } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useChangePasswordMutation } from "@/lib/auth/auth.mutations";

export default function ChangePasswordScreen() {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mutation = useChangePasswordMutation();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    !mutation.isPending;

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
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={theme.colors.textPrimary}
          />
        </Pressable>
        <Text
          style={[styles.headerTitle, { color: theme.colors.textPrimary }]}
        >
          {t("changePassword.title")}
        </Text>
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
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inputContainer}>
            <Text
              style={[styles.inputLabel, { color: theme.colors.textSecondary }]}
            >
              {t("changePassword.currentPassword")}
            </Text>
            <PasswordInput
              style={[
                styles.input,
                {
                  borderBottomColor: theme.colors.textSecondary + "20",
                  color: theme.colors.textPrimary,
                },
              ]}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder={t("changePassword.currentPasswordPlaceholder")}
              placeholderTextColor={theme.colors.textSecondary + "60"}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text
              style={[styles.inputLabel, { color: theme.colors.textSecondary }]}
            >
              {t("changePassword.newPassword")}
            </Text>
            <PasswordInput
              style={[
                styles.input,
                {
                  borderBottomColor: theme.colors.textSecondary + "20",
                  color: theme.colors.textPrimary,
                },
              ]}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={t("changePassword.newPasswordPlaceholder")}
              placeholderTextColor={theme.colors.textSecondary + "60"}
            />
            <Text
              style={[styles.inputHint, { color: theme.colors.textSecondary }]}
            >
              {t("changePassword.passwordHint")}
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <Text
              style={[styles.inputLabel, { color: theme.colors.textSecondary }]}
            >
              {t("changePassword.confirmPassword")}
            </Text>
            <PasswordInput
              style={[
                styles.input,
                {
                  borderBottomColor: theme.colors.textSecondary + "20",
                  color: theme.colors.textPrimary,
                },
              ]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t("changePassword.confirmPasswordPlaceholder")}
              placeholderTextColor={theme.colors.textSecondary + "60"}
            />
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={({ pressed }) => [
              styles.submitButton,
              {
                backgroundColor: theme.colors.primary,
                opacity: !canSubmit ? 0.4 : pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={styles.submitButtonText}>
              {mutation.isPending
                ? t("common.loading")
                : t("changePassword.submit")}
            </Text>
          </Pressable>
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
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 15,
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
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    borderBottomWidth: 1,
    paddingVertical: 10,
    fontSize: 15,
  },
  inputHint: {
    fontSize: 11,
    marginTop: 6,
  },
  submitButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
