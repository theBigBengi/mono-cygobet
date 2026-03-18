// app/reset-password.tsx
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useRef, useState } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/lib/theme";
import { AppText, PasswordInput } from "@/components/ui";
import { useResetPasswordMutation } from "@/lib/auth/auth.mutations";
import { getAuthErrorMessage } from "@/lib/errors/getAuthErrorMessage";

export default function ResetPasswordScreen() {
  return (
    <ErrorBoundary feature="reset-password">
      <ScreenContent />
    </ErrorBoundary>
  );
}

function ScreenContent() {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();

  const confirmPasswordRef = useRef<import("react-native").TextInput>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const mutation = useResetPasswordMutation();

  const handleNewPasswordChange = (text: string) => {
    setNewPassword(text);
    if (formError) setFormError(null);
  };

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    if (formError) setFormError(null);
  };

  const handleSubmit = async () => {
    if (newPassword.length < 8) {
      setFormError(t("resetPassword.passwordTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError(t("resetPassword.passwordsDontMatch"));
      return;
    }

    setFormError(null);
    try {
      await mutation.mutateAsync({ token: token!, newPassword });
      setSuccess(true);
    } catch (err) {
      setFormError(getAuthErrorMessage(err));
    }
  };

  // No token — invalid link
  if (!token) {
    return (
      <SafeAreaView
        style={[styles.root, { backgroundColor: theme.colors.background }]}
        edges={["top", "left", "right"]}
      >
        <View style={styles.centerContent}>
          <AppText variant="display" style={styles.title}>
            {t("resetPassword.invalidLink")}
          </AppText>
          <AppText variant="body" color="secondary" style={styles.subtitle}>
            {t("resetPassword.invalidLinkMessage")}
          </AppText>
          <Pressable
            style={[
              styles.button,
              {
                backgroundColor: theme.colors.primary,
                shadowColor: theme.colors.primary,
              },
            ]}
            onPress={() => router.replace("/forgot-password")}
          >
            <AppText
              variant="body"
              color="onPrimary"
              style={styles.buttonText}
            >
              {t("resetPassword.requestNewLink")}
            </AppText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Success state
  if (success) {
    return (
      <SafeAreaView
        style={[styles.root, { backgroundColor: theme.colors.background }]}
        edges={["top", "left", "right"]}
      >
        <View style={styles.centerContent}>
          <AppText variant="display" style={styles.title}>
            {t("resetPassword.successTitle")}
          </AppText>
          <AppText variant="body" color="secondary" style={styles.subtitle}>
            {t("resetPassword.successMessage")}
          </AppText>
          <Pressable
            style={[
              styles.button,
              {
                backgroundColor: theme.colors.primary,
                shadowColor: theme.colors.primary,
              },
            ]}
            onPress={() => router.replace("/sign-in")}
          >
            <AppText
              variant="body"
              color="onPrimary"
              style={styles.buttonText}
            >
              {t("resetPassword.goToSignIn")}
            </AppText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Form state
  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.colors.background }]}
      edges={["top", "left", "right"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AppText variant="display" style={styles.title}>
            {t("resetPassword.title")}
          </AppText>
          <AppText variant="body" color="secondary" style={styles.subtitle}>
            {t("resetPassword.subtitle")}
          </AppText>

          <View style={styles.form}>
            <PasswordInput
              style={[
                styles.input,
                {
                  color: theme.colors.textPrimary,
                  backgroundColor: theme.colors.cardBackground,
                },
              ]}
              placeholder={t("resetPassword.newPassword")}
              placeholderTextColor={theme.colors.textSecondary}
              value={newPassword}
              onChangeText={handleNewPasswordChange}
              editable={!mutation.isPending}
              accessibilityLabel={t("resetPassword.newPassword")}
              returnKeyType="next"
              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
              textContentType="newPassword"
              autoComplete="new-password"
            />

            <PasswordInput
              ref={confirmPasswordRef}
              style={[
                styles.input,
                {
                  color: theme.colors.textPrimary,
                  backgroundColor: theme.colors.cardBackground,
                },
              ]}
              placeholder={t("resetPassword.confirmPassword")}
              placeholderTextColor={theme.colors.textSecondary}
              value={confirmPassword}
              onChangeText={handleConfirmPasswordChange}
              editable={!mutation.isPending}
              accessibilityLabel={t("resetPassword.confirmPassword")}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              textContentType="newPassword"
              autoComplete="new-password"
            />

            <AppText variant="caption" color="secondary" style={styles.hint}>
              {t("resetPassword.passwordHint")}
            </AppText>

            {formError && (
              <AppText variant="caption" color="danger" style={styles.error}>
                {formError}
              </AppText>
            )}

            <Pressable
              style={[
                styles.button,
                {
                  backgroundColor: theme.colors.primary,
                  shadowColor: theme.colors.primary,
                },
                mutation.isPending && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <AppText
                  variant="body"
                  color="onPrimary"
                  style={styles.buttonText}
                >
                  {t("resetPassword.submit")}
                </AppText>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    marginBottom: 40,
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  input: {
    borderWidth: 0,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    marginBottom: 14,
  },
  hint: {
    marginBottom: 16,
    marginTop: -8,
  },
  error: {
    marginBottom: 16,
    textAlign: "center",
  },
  button: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontWeight: "600",
  },
});
