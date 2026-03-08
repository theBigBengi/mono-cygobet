// app/sign-in.tsx
// Sign-in screen - always accessible, redirects to home after successful login

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useRef, useState, useCallback } from "react";
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth/useAuth";
import { useTheme } from "@/lib/theme";
import { AppText, PasswordInput } from "@/components/ui";
import { getAuthErrorMessage } from "@/lib/errors/getAuthErrorMessage";

export default function SignInScreen() {
  return (
    <ErrorBoundary feature="sign-in">
      <ScreenContent />
    </ErrorBoundary>
  );
}

function ScreenContent() {
  const { t } = useTranslation("common");
  const emailOrUsernameRef = useRef("");
  const passwordRef = useRef("");
  const passwordInputRef = useRef<import("react-native").TextInput>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login, error } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  const handleEmailOrUsernameChange = (text: string) => {
    emailOrUsernameRef.current = text;
    if (formError) setFormError(null);
  };

  const handlePasswordChange = (text: string) => {
    passwordRef.current = text;
    if (formError) setFormError(null);
  };

  const handleLogin = async () => {
    const emailOrUsername = emailOrUsernameRef.current;
    const password = passwordRef.current;

    if (!emailOrUsername.trim() || !password.trim()) {
      Alert.alert(t("errors.error"), t("auth.errorBothFields"));
      return;
    }

    setFormError(null);
    setIsLoading(true);
    try {
      await login(emailOrUsername.trim(), password);
      router.replace("/");
    } catch (err) {
      setFormError(getAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

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
            {t("auth.login")}
          </AppText>
          <AppText variant="body" color="secondary" style={styles.subtitle}>
            {t("auth.enterCredentials")}
          </AppText>

          <View style={styles.form}>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: theme.colors.border,
                  color: theme.colors.textPrimary,
                  backgroundColor: theme.colors.surface,
                },
              ]}
              placeholder={t("auth.emailOrUsername")}
              placeholderTextColor={theme.colors.textSecondary}
              onChangeText={handleEmailOrUsernameChange}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
              accessibilityLabel={t("auth.emailOrUsername")}
              returnKeyType="next"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              textContentType="username"
              autoComplete="username"
            />

            <PasswordInput
              ref={passwordInputRef}
              style={[
                styles.input,
                {
                  borderColor: theme.colors.border,
                  color: theme.colors.textPrimary,
                  backgroundColor: theme.colors.surface,
                },
              ]}
              placeholder={t("auth.password")}
              placeholderTextColor={theme.colors.textSecondary}
              onChangeText={handlePasswordChange}
              editable={!isLoading}
              accessibilityLabel={t("auth.password")}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              textContentType="password"
              autoComplete="password"
            />

            <Pressable
              onPress={() => router.push("/forgot-password")}
              disabled={isLoading}
              style={styles.forgotPassword}
              accessibilityRole="link"
              accessibilityLabel={t("auth.forgotPassword")}
            >
              <AppText
                variant="caption"
                style={{ color: theme.colors.primary, fontWeight: "600" }}
              >
                {t("auth.forgotPassword")}
              </AppText>
            </Pressable>

            {(formError || error) && (
              <AppText variant="caption" color="danger" style={styles.error}>
                {formError || error}
              </AppText>
            )}

            <Pressable
              style={[
                styles.button,
                { backgroundColor: theme.colors.primary },
                isLoading && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel={t("auth.login")}
              accessibilityState={{ disabled: isLoading }}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <AppText
                  variant="body"
                  color="onPrimary"
                  style={styles.buttonText}
                >
                  {t("auth.login")}
                </AppText>
              )}
            </Pressable>

            {/* TODO: Re-enable sign-up link when registration is open again
            <View style={styles.toggleRow}>
              <AppText variant="caption" color="secondary">
                {t("auth.dontHaveAccount")}
              </AppText>
              <Pressable
                onPress={() => router.replace("/sign-up")}
                disabled={isLoading}
              >
                <AppText
                  variant="caption"
                  style={{ color: theme.colors.primary, fontWeight: "600" }}
                >
                  {t("auth.signUp")}
                </AppText>
              </Pressable>
            </View>
            */}
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
    padding: 20,
  },
  title: {
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    marginBottom: 32,
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 16,
    marginTop: -8,
  },
  error: {
    marginBottom: 16,
    textAlign: "center",
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontWeight: "600",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    gap: 4,
  },
});
