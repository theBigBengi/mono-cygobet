// app/change-password.tsx
// Change password screen (email/password users only).

import { ErrorBoundary } from "@/components/ErrorBoundary";
import React, { useRef, useState } from "react";
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
  return (
    <ErrorBoundary feature="change-password">
      <ScreenContent />
    </ErrorBoundary>
  );
}

function ScreenContent() {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mutation = useChangePasswordMutation();

  const newPasswordRef = useRef<import("react-native").TextInput>(null);
  const confirmPasswordRef = useRef<import("react-native").TextInput>(null);
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
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.ms, paddingHorizontal: theme.spacing.ml, paddingBottom: theme.spacing.ms }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { width: theme.spacing.xl, height: theme.spacing.xl }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={t("accessibility.goBack")}
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
        <View style={[styles.headerSpacer, { width: theme.spacing.xl }]} />
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
            { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg, paddingBottom: insets.bottom + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.inputContainer, { marginBottom: theme.spacing.lg }]}>
            <Text
              style={[styles.inputLabel, { color: theme.colors.textSecondary, marginBottom: theme.spacing.sm }]}
            >
              {t("changePassword.currentPassword")}
            </Text>
            <PasswordInput
              style={[
                styles.input,
                {
                  color: theme.colors.textPrimary,
                  backgroundColor: theme.colors.cardBackground,
                  borderRadius: theme.radius.md,
                  padding: theme.spacing.md,
                },
              ]}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder={t("changePassword.currentPasswordPlaceholder")}
              placeholderTextColor={theme.colors.textSecondary + "60"}
              accessibilityLabel={t("changePassword.currentPassword")}
              returnKeyType="next"
              onSubmitEditing={() => newPasswordRef.current?.focus()}
              textContentType="password"
              autoComplete="current-password"
            />
          </View>

          <View style={[styles.inputContainer, { marginBottom: theme.spacing.lg }]}>
            <Text
              style={[styles.inputLabel, { color: theme.colors.textSecondary, marginBottom: theme.spacing.sm }]}
            >
              {t("changePassword.newPassword")}
            </Text>
            <PasswordInput
              ref={newPasswordRef}
              style={[
                styles.input,
                {
                  color: theme.colors.textPrimary,
                  backgroundColor: theme.colors.cardBackground,
                  borderRadius: theme.radius.md,
                  padding: theme.spacing.md,
                },
              ]}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={t("changePassword.newPasswordPlaceholder")}
              placeholderTextColor={theme.colors.textSecondary + "60"}
              accessibilityLabel={t("changePassword.newPassword")}
              returnKeyType="next"
              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
              textContentType="newPassword"
              autoComplete="new-password"
            />
            <Text
              style={[styles.inputHint, { color: theme.colors.textSecondary, marginTop: theme.spacing.xs }]}
            >
              {t("changePassword.passwordHint")}
            </Text>
          </View>

          <View style={[styles.inputContainer, { marginBottom: theme.spacing.lg }]}>
            <Text
              style={[styles.inputLabel, { color: theme.colors.textSecondary, marginBottom: theme.spacing.sm }]}
            >
              {t("changePassword.confirmPassword")}
            </Text>
            <PasswordInput
              ref={confirmPasswordRef}
              style={[
                styles.input,
                {
                  color: theme.colors.textPrimary,
                  backgroundColor: theme.colors.cardBackground,
                  borderRadius: theme.radius.md,
                  padding: theme.spacing.md,
                },
              ]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t("changePassword.confirmPasswordPlaceholder")}
              placeholderTextColor={theme.colors.textSecondary + "60"}
              accessibilityLabel={t("changePassword.confirmPassword")}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              textContentType="newPassword"
              autoComplete="new-password"
            />
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={({ pressed }) => [
              styles.submitButton,
              {
                backgroundColor: theme.colors.primary,
                shadowColor: theme.colors.primary,
                opacity: !canSubmit ? 0.4 : pressed ? 0.8 : 1,
                marginTop: theme.spacing.ms,
                paddingVertical: theme.spacing.md,
                borderRadius: theme.radius.md,
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
  },
  backButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  headerSpacer: {
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
  },
  inputContainer: {
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  input: {
    borderWidth: 0,
    fontSize: 16,
  },
  inputHint: {
    fontSize: 11,
  },
  submitButton: {
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
